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
    throw new Error("Raw network printing is not available on this device.");
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

export interface MedianPosPrinterLike {
  connect?: () => Promise<void>;
  disconnect?: () => Promise<void>;
  discover: (options: { transport?: PrinterTransport }) => Promise<
    | string[]
    | {
        devices?: Array<string | { id?: string; name?: string }>;
      }
  >;
  printRaw: (options: {
    transport: PrinterTransport;
    host?: string;
    port?: number;
    deviceId?: string;
    dataBase64: string;
    encoding: "base64";
  }) => Promise<void>;
}

export const medianPosPrinter = (): MedianPosPrinterLike | undefined =>
  window.median?.posPrinter;

export async function printMedianRaw(
  plugin: MedianPosPrinterLike,
  options: {
    transport: PrinterTransport;
    host?: string;
    port?: number;
    deviceId?: string;
    data: string;
  }
) {
  await plugin.connect?.();
  await plugin.printRaw({
    transport: options.transport,
    host: options.host,
    port: options.port,
    deviceId: options.deviceId,
    dataBase64: escPosToBase64(options.data),
    encoding: "base64",
  });
}
