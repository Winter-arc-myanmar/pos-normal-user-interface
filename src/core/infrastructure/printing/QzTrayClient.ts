import qz from "qz-tray";
import { KdsTicket } from "../../domain/entities/Cashier";
import { PrinterBinding } from "@/lib/pos/printerBindingStorage";
import {
  formatKdsTicket,
  formatKitchenSlip,
  formatPrinterTest,
  formatSaleReceipt,
  KitchenSlip,
  SaleReceipt,
} from "@/lib/printing/formatKdsTicket";
import {
  isRetryableUsbQueueError,
  rankUsbPrintQueues,
  usbNameMatches,
} from "@/lib/printing/usbPrintTarget";

type UsbPrinterDevice = {
  vendorId: string;
  productId: string;
  product?: string;
  manufacturer?: string;
};

type QueueDetail = { name?: string; connection?: string };

const asList = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const isReceiptUsbDevice = (device: UsbPrinterDevice) =>
  /print|pos|xprinter|thermal|receipt|escpos/i.test(
    `${device.product || ""} ${device.manufacturer || ""}`
  );

const escPosHex = (data: string) =>
  Array.from(data, (char) => (char.charCodeAt(0) & 0xff).toString(16).padStart(2, "0")).join(
    ""
  );

const outEndpoint = (endpoint: string) => {
  const value = Number.parseInt(endpoint, 16);
  if (!Number.isFinite(value) || (value & 0x80) !== 0) return null;
  return endpoint;
};

const offlinePrinterNames = (status: unknown) => {
  const names = new Set<string>();
  const visit = (entry: unknown) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as { printerName?: string; name?: string; status?: string };
    const name = record.printerName || record.name;
    if (name && /offline|not_available|unavailable/i.test(String(record.status || ""))) {
      names.add(name);
    }
  };
  if (Array.isArray(status)) status.forEach(visit);
  else visit(status);
  return names;
};

const qzError = (caught: unknown): Error => {
  const message = caught instanceof Error ? caught.message : String(caught || "");
  if (/block|denied|reject|not allowed/i.test(message)) {
    return new Error(
      "QZ Tray blocked this site. Click Allow on the QZ Tray prompt, then try again."
    );
  }
  if (
    /ECONNREFUSED|Unable to establish connection|WebSocket connection failed|Connection closed before/i.test(
      message
    )
  ) {
    return new Error(
      "QZ Tray is not running. Install and open QZ Tray, then try again."
    );
  }
  return new Error(message || "Printer communication failed");
};

export class QzTrayClient {
  private connecting: Promise<void> | null = null;
  private readonly usbQueueOverride = new Map<string, string>();

  isConnected(): boolean {
    return qz.websocket.isActive();
  }

  connect(): Promise<void> {
    if (this.isConnected()) return Promise.resolve();
    if (this.connecting) return this.connecting;
    this.connecting = qz.websocket
      .connect({
        host: "localhost",
        retries: 5,
        delay: 1,
        usingSecure: window.location.protocol === "https:",
      } as Parameters<typeof qz.websocket.connect>[0])
      .catch((caught: unknown) => {
        throw qzError(caught);
      })
      .finally(() => {
        this.connecting = null;
      });
    return this.connecting;
  }

  async disconnect(): Promise<void> {
    if (this.isConnected()) await qz.websocket.disconnect();
  }

  async findPrinters(): Promise<string[]> {
    await this.connect();
    try {
      const result = await qz.printers.find();
      return Array.isArray(result) ? result : result ? [result] : [];
    } catch (caught) {
      throw qzError(caught);
    }
  }

  private config(binding: PrinterBinding): unknown {
    if (binding.transport === "NETWORK") {
      if (!binding.host || !binding.port) {
        throw new Error("Network printer IP address and port are required");
      }
      return qz.configs.create({ host: binding.host, port: binding.port });
    }
    if (!binding.deviceName) {
      throw new Error("Select an installed printer");
    }
    return qz.configs.create(binding.deviceName);
  }

  private usbOverrideKey(binding: PrinterBinding) {
    return binding.id || binding.deviceName || binding.displayName;
  }

  private preferUsbDevices(binding: PrinterBinding, devices: UsbPrinterDevice[]) {
    const preferred = binding.deviceName || binding.displayName;
    return [...devices].sort((left, right) => {
      const leftMatch = Number(
        usbNameMatches(preferred, left.product) || usbNameMatches(preferred, left.manufacturer)
      );
      const rightMatch = Number(
        usbNameMatches(preferred, right.product) ||
          usbNameMatches(preferred, right.manufacturer)
      );
      return rightMatch - leftMatch;
    });
  }

  /** Sends ESC/POS to a receipt printer that is plugged in now, ignoring stale Windows queues. */
  private async printConnectedUsb(binding: PrinterBinding, data: string): Promise<boolean> {
    let devices: UsbPrinterDevice[] = [];
    try {
      devices = this.preferUsbDevices(
        binding,
        asList(await qz.usb.listDevices(false)).filter(isReceiptUsbDevice)
      );
    } catch {
      return false;
    }
    for (const device of devices) {
      let interfaces: string[] = [];
      try {
        interfaces = asList(
          await qz.usb.listInterfaces({
            vendorId: device.vendorId,
            productId: device.productId,
          })
        );
      } catch {
        continue;
      }
      for (const iface of interfaces) {
        try {
          await qz.usb.claimDevice({
            vendorId: device.vendorId,
            productId: device.productId,
            interface: iface,
          });
          const endpoints = asList(
            await qz.usb.listEndpoints({
              vendorId: device.vendorId,
              productId: device.productId,
              interface: iface,
            })
          );
          const endpoint = endpoints.map(outEndpoint).find(Boolean);
          if (!endpoint) continue;
          await qz.usb.sendData({
            vendorId: device.vendorId,
            productId: device.productId,
            endpoint,
            data: { data: escPosHex(data), type: "HEX" },
          });
          return true;
        } catch {
          // This interface is not the live receipt printer. Try the next one.
        } finally {
          await qz.usb
            .releaseDevice({ vendorId: device.vendorId, productId: device.productId })
            .catch(() => undefined);
        }
      }
    }
    return false;
  }

  /** Online USB queues, with a leftover unplugged printer ranked last. */
  private async usbQueueCandidates(binding: PrinterBinding): Promise<PrinterBinding[]> {
    const override = this.usbQueueOverride.get(this.usbOverrideKey(binding));
    let queues: QueueDetail[] = [];
    let devices: UsbPrinterDevice[] = [];
    try {
      queues = asList(await qz.printers.details());
    } catch {
      return [binding];
    }
    try {
      devices = asList(await qz.usb.listDevices(false));
    } catch {
      devices = [];
    }
    const usbNames = queues
      .filter((item) => item.name && /^USB/i.test(item.connection || ""))
      .map((item) => item.name as string);
    if (!usbNames.length) return [binding];

    let offline = new Set<string>();
    try {
      await qz.printers.startListening(usbNames);
      offline = offlinePrinterNames(await qz.printers.getStatus());
    } catch {
      offline = new Set();
    } finally {
      await qz.printers.stopListening().catch(() => undefined);
    }

    const ranked = rankUsbPrintQueues({
      savedName: override || binding.deviceName,
      queues,
      offlineNames: offline,
      connectedDevices: devices,
    });
    if (!ranked.length) {
      if (offline.size) {
        throw new Error(
          "The USB receipt printer is offline. Plug in the printer and try again."
        );
      }
      return [binding];
    }
    return ranked.map((deviceName) => ({ ...binding, deviceName }));
  }

  private rememberUsbQueue(binding: PrinterBinding, usedName?: string) {
    const key = this.usbOverrideKey(binding);
    if (!usedName || usedName === binding.deviceName) {
      this.usbQueueOverride.delete(key);
      return;
    }
    this.usbQueueOverride.set(key, usedName);
  }

  private async printRaw(binding: PrinterBinding, data: string): Promise<void> {
    await this.connect();
    try {
      if (binding.transport === "USB" && (await this.printConnectedUsb(binding, data))) {
        return;
      }
      if (binding.transport === "USB") {
        const candidates = await this.usbQueueCandidates(binding);
        let lastError: Error | null = null;
        for (const target of candidates) {
          try {
            await qz.print(this.config(target), [
              { type: "raw", format: "command", data },
            ]);
            this.rememberUsbQueue(binding, target.deviceName);
            return;
          } catch (caught) {
            lastError = qzError(caught);
            if (!isRetryableUsbQueueError(lastError.message)) throw lastError;
          }
        }
        throw lastError ?? new Error("USB printer is not connected. Plug it in and try again.");
      }
      await qz.print(this.config(binding), [
        { type: "raw", format: "command", data },
      ]);
    } catch (caught) {
      const error = qzError(caught);
      if (/Cannot find printer with name|printer .* not found/i.test(error.message)) {
        const name = binding.deviceName || binding.displayName;
        throw new Error(
          `Printer "${name}" is not installed on this POS computer. ` +
            "In Settings > KDS stations, assign the connected local printer to this station."
        );
      }
      throw error;
    }
  }

  testPrint(binding: PrinterBinding): Promise<void> {
    return this.printRaw(binding, formatPrinterTest(binding.displayName));
  }

  printKdsTicket(binding: PrinterBinding, ticket: KdsTicket): Promise<void> {
    return this.printRaw(binding, formatKdsTicket(ticket));
  }

  printKitchen(binding: PrinterBinding, slip: KitchenSlip): Promise<void> {
    return this.printRaw(binding, formatKitchenSlip(slip));
  }

  printReceipt(binding: PrinterBinding, receipt: SaleReceipt): Promise<void> {
    return this.printRaw(binding, formatSaleReceipt(receipt));
  }
}

export const qzTrayClient = new QzTrayClient();
