import { PrinterTransport } from "@/lib/pos/printerBindingStorage";
import { chunkBytes, encodeEscPos, escPosToBase64 } from "./escPosBytes";

type UsbDeviceLike = {
  productName?: string;
  serialNumber?: string;
  vendorId: number;
  productId: number;
  configuration?: { interfaces: UsbInterfaceLike[] };
  open: () => Promise<void>;
  close: () => Promise<void>;
  selectConfiguration: (value: number) => Promise<void>;
  claimInterface: (value: number) => Promise<void>;
  releaseInterface: (value: number) => Promise<void>;
  transferOut: (endpointNumber: number, data: Uint8Array) => Promise<unknown>;
};

type UsbInterfaceLike = {
  interfaceNumber: number;
  alternate?: {
    endpoints: Array<{ direction: string; type: string; endpointNumber: number }>;
  };
};

type UsbNavigator = Navigator & {
  usb?: {
    getDevices: () => Promise<UsbDeviceLike[]>;
    requestDevice: (options: { filters: unknown[] }) => Promise<UsbDeviceLike>;
  };
};

type BluetoothDeviceLike = {
  id: string;
  name?: string;
  gatt?: {
    connect: () => Promise<BluetoothGattServerLike>;
    disconnect: () => void;
  };
};

type BluetoothGattServerLike = {
  getPrimaryService: (uuid: string) => Promise<{
    getCharacteristic: (uuid: string) => Promise<{ writeValue: (value: BufferSource) => Promise<void> }>;
  }>;
  disconnect: () => void;
};

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: {
      acceptAllDevices?: boolean;
      optionalServices?: string[];
    }) => Promise<BluetoothDeviceLike>;
    getDevices?: () => Promise<BluetoothDeviceLike[]>;
  };
};

type TcpSocketLike = {
  opened: Promise<{ readable: unknown; writable: WritableStream<Uint8Array> }>;
  close: () => void;
};

type TcpSocketConstructor = new (
  host: string,
  options: { port: number }
) => TcpSocketLike;

const BLE_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const BLE_CHAR = "00002af1-0000-1000-8000-00805f9b34fb";
const BLE_ALT_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb";
const BLE_ALT_CHAR = "0000ffe1-0000-1000-8000-00805f9b34fb";

export const isWebUsbSupported = () =>
  typeof navigator !== "undefined" && Boolean(usbNavigator().usb);

export const isWebBluetoothSupported = () =>
  typeof navigator !== "undefined" && Boolean(bluetoothNavigator().bluetooth);

export const isDirectTcpSupported = () =>
  typeof globalThis !== "undefined" && "TCPSocket" in globalThis;

/** Chrome/Android cannot open printer port 9100. QZ Tray or a native plugin can. */
export const ANDROID_LAN_PRINTER_ERROR =
  "This Android browser cannot open a Wi-Fi printer by IP. Raw port 9100 only works on a Windows/Mac POS with QZ Tray. On this tablet use USB or Bluetooth.";

/** Shown when a job needs the native Android/Median bridge but it is not installed. */
export const NATIVE_PRINTER_UNAVAILABLE =
  "Android direct printing needs the POS printer native plugin (window.median.posPrinter). Enable it in the app build.";

export const canOpenRawLanPrinter = () =>
  Boolean(medianPosPrinter()) || isDirectTcpSupported();

const usbNavigator = () => navigator as UsbNavigator;
const bluetoothNavigator = () => navigator as BluetoothNavigator;

const deviceLabel = (device: UsbDeviceLike) =>
  device.productName ||
  device.serialNumber ||
  `USB ${device.vendorId.toString(16)}:${device.productId.toString(16)}`;

export async function listWebUsbPrinters(): Promise<string[]> {
  if (!isWebUsbSupported()) return [];
  const devices = await usbNavigator().usb!.getDevices();
  return devices.map((device) => deviceLabel(device));
}

export async function requestWebUsbPrinter(): Promise<string[]> {
  if (!isWebUsbSupported()) {
    throw new Error("WebUSB is not available in this browser");
  }
  const device = await usbNavigator().usb!.requestDevice({ filters: [] });
  return [deviceLabel(device)];
}

export async function requestWebBluetoothPrinter(): Promise<string[]> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth is not available in this browser");
  }
  const device = await bluetoothNavigator().bluetooth!.requestDevice({
    acceptAllDevices: true,
    optionalServices: [BLE_SERVICE, BLE_ALT_SERVICE],
  });
  return [device.name || device.id];
}

const writeUsbDevice = async (device: UsbDeviceLike, data: string) => {
  await device.open();
  if (!device.configuration) {
    await device.selectConfiguration(1);
  }
  const iface = device.configuration?.interfaces[0];
  if (!iface) throw new Error("USB printer interface not found");
  await device.claimInterface(iface.interfaceNumber);
  const endpoint = iface.alternate?.endpoints.find(
    (item) => item.direction === "out" && item.type === "bulk"
  );
  if (!endpoint) throw new Error("USB printer output endpoint not found");
  const bytes = encodeEscPos(data);
  for (const chunk of chunkBytes(bytes)) {
    await device.transferOut(endpoint.endpointNumber, chunk);
  }
  await device.releaseInterface(iface.interfaceNumber);
  await device.close();
};

/** Saved name first, then any other paired printer that is actually plugged in. */
const connectedUsbPrinters = (devices: UsbDeviceLike[], deviceName: string) => {
  const saved = devices.filter(
    (item) => deviceLabel(item) === deviceName || item.serialNumber === deviceName
  );
  const others = devices.filter((item) => !saved.includes(item));
  return [...saved, ...others];
};

export async function printWebUsb(deviceName: string, data: string): Promise<void> {
  if (!isWebUsbSupported()) {
    throw new Error("WebUSB is not available in this browser");
  }
  const devices = connectedUsbPrinters(await usbNavigator().usb!.getDevices(), deviceName);
  if (!devices.length) {
    throw new Error("USB printer not paired. Tap Discover and allow the printer again.");
  }
  let lastError: Error | null = null;
  for (const device of devices) {
    try {
      await writeUsbDevice(device, data);
      return;
    } catch (caught) {
      lastError = caught instanceof Error ? caught : new Error("USB printer is not connected");
      await device.close().catch(() => undefined);
    }
  }
  throw lastError ?? new Error("USB printer is not connected. Plug it in and try again.");
}

async function writeBleCharacteristic(
  characteristic: { writeValue: (value: BufferSource) => Promise<void> },
  data: string
) {
  const bytes = encodeEscPos(data);
  for (const chunk of chunkBytes(bytes, 180)) {
    await characteristic.writeValue(new Uint8Array(chunk));
  }
}

const resolveBluetoothDevice = async (deviceName: string) => {
  const bluetooth = bluetoothNavigator().bluetooth!;
  const getDevices = bluetooth.getDevices;
  if (getDevices) {
    const paired = await getDevices();
    const match = paired.find(
      (item) => item.name === deviceName || item.id === deviceName
    );
    if (match) return match;
  }
  return bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [BLE_SERVICE, BLE_ALT_SERVICE],
  });
};

export async function printWebBluetooth(deviceName: string, data: string): Promise<void> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth is not available in this browser");
  }
  const device = await resolveBluetoothDevice(deviceName);
  const server = await device.gatt?.connect();
  if (!server) throw new Error("Unable to connect to the Bluetooth printer");
  try {
    for (const serviceId of [BLE_SERVICE, BLE_ALT_SERVICE]) {
      try {
        const service = await server.getPrimaryService(serviceId);
        const charId = serviceId === BLE_SERVICE ? BLE_CHAR : BLE_ALT_CHAR;
        const characteristic = await service.getCharacteristic(charId);
        await writeBleCharacteristic(characteristic, data);
        return;
      } catch {
        // Try the next common ESC/POS BLE service.
      }
    }
    throw new Error("Bluetooth printer service not found");
  } finally {
    device.gatt?.disconnect();
  }
}

export async function printLanTcp(
  host: string,
  port: number,
  data: string
): Promise<void> {
  const TCPSocket = (globalThis as { TCPSocket?: TcpSocketConstructor }).TCPSocket;
  if (!TCPSocket) {
    throw new Error(ANDROID_LAN_PRINTER_ERROR);
  }
  const socket = new TCPSocket(host, { port });
  const opened = await socket.opened;
  const writer = opened.writable.getWriter();
  try {
    await writer.write(encodeEscPos(data));
  } finally {
    await writer.close();
    socket.close();
  }
}

export type MedianPrinterDevice = string | { id?: string; name?: string };
export type MedianDiscoverResult =
  | string[]
  | { devices?: MedianPrinterDevice[]; success?: boolean; error?: string };

export type PosPrinterMethod = "connect" | "disconnect" | "discover" | "printRaw";

/**
 * Shape of the Android/Median native plugin exposed as `window.median.posPrinter`
 * (or the legacy `window.gonative.posPrinter`). Median's JavaScript bridge passes
 * ONE options object per call and either resolves a Promise or invokes the
 * supplied `callback`, so the option/return types are intentionally loose and
 * normalized by `callPosPrinter`.
 */
export interface MedianPosPrinterLike {
  connect?: (options?: Record<string, unknown>) => Promise<unknown> | unknown;
  disconnect?: (options?: Record<string, unknown>) => Promise<unknown> | unknown;
  discover: (options: Record<string, unknown>) => Promise<unknown> | unknown;
  printRaw: (options: Record<string, unknown>) => Promise<unknown> | unknown;
}

const posPrinterHost = ():
  | { posPrinter?: MedianPosPrinterLike }
  | undefined => {
  if (typeof window === "undefined") return undefined;
  const scoped = window as unknown as {
    median?: { posPrinter?: MedianPosPrinterLike };
    gonative?: { posPrinter?: MedianPosPrinterLike };
  };
  return scoped.median ?? scoped.gonative;
};

export const medianPosPrinter = (): MedianPosPrinterLike | undefined =>
  posPrinterHost()?.posPrinter;

/** True when the Android/Median native ESC/POS bridge is available. */
export const hasNativePrinterBridge = (): boolean => Boolean(medianPosPrinter());

export const hasPluginMethod = (method: PosPrinterMethod): boolean => {
  const plugin = medianPosPrinter();
  return Boolean(
    plugin &&
      typeof (plugin as unknown as Record<string, unknown>)[method] === "function"
  );
};

/**
 * Calls a native plugin method using Median's conventions: a single options
 * object that may carry a `callback`, and a return value that may be a Promise.
 * Resolves on the first of {promise settlement, callback, sync return value} and
 * rejects when the native side reports `{ success: false, error }`.
 */
export function callPosPrinter<T = unknown>(
  method: PosPrinterMethod,
  options: Record<string, unknown> = {}
): Promise<T> {
  const plugin = medianPosPrinter();
  if (!plugin) return Promise.reject(new Error(NATIVE_PRINTER_UNAVAILABLE));

  const fn = (plugin as unknown as Record<string, unknown>)[method];
  if (typeof fn !== "function") {
    return Promise.reject(new Error(`Printer bridge is missing ${method}()`));
  }

  const invoke = fn as (args?: Record<string, unknown>) => unknown;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const settle = (result: unknown) => {
      if (settled) return;
      settled = true;
      const record = (result || {}) as { success?: boolean; error?: string };
      if (record.success === false) {
        reject(new Error(record.error || `Printer ${method} failed`));
        return;
      }
      resolve(result as T);
    };
    const fail = (caught: unknown) => {
      if (settled) return;
      settled = true;
      reject(caught instanceof Error ? caught : new Error(String(caught)));
    };

    try {
      const returned = invoke.call(plugin, { ...options, callback: settle });
      if (returned && typeof (returned as PromiseLike<unknown>).then === "function") {
        (returned as Promise<unknown>).then(settle, fail);
      } else if (returned !== undefined) {
        settle(returned);
      } else if (invoke.length === 0) {
        // A no-argument, non-promise method can never call back: treat as done.
        settle(undefined);
      }
    } catch (caught) {
      fail(caught);
    }
  });
}

export function nativePrinterNames(result: MedianDiscoverResult): string[] {
  const devices = Array.isArray(result) ? result : result.devices || [];
  return devices
    .map((device) =>
      typeof device === "string" ? device : device.id || device.name || ""
    )
    .filter(Boolean);
}

export async function printMedianRaw(options: {
  transport: PrinterTransport;
  host?: string;
  port?: number;
  deviceId?: string;
  data: string;
}) {
  if (hasPluginMethod("connect")) await callPosPrinter("connect", {});
  await callPosPrinter("printRaw", {
    transport: options.transport,
    host: options.host,
    port: options.port,
    deviceId: options.deviceId,
    dataBase64: escPosToBase64(options.data),
    encoding: "base64",
  });
}
