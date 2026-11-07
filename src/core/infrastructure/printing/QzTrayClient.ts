import qz from "qz-tray";
import { escPosHex } from "@/lib/printing/escPosBytes";
import { KdsTicket } from "../../domain/entities/Cashier";
import { PrinterBinding, PrinterTransport } from "@/lib/pos/printerBindingStorage";
import {
  formatKdsTicket,
  formatKitchenSlip,
  formatPrinterTest,
  formatSaleReceipt,
  KitchenSlip,
  SaleReceipt,
} from "@/lib/printing/formatKdsTicket";
import {
  isReceiptQueueName,
  isReceiptUsbPrinter,
  isRetryableUsbQueueError,
  parseUsbDeviceRef,
  rankUsbPrintQueues,
  toQzUsbHex,
  uniquePrinterNames,
  usbDeviceLabel,
  usbDeviceMatchesName,
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

const qzUsbDevice = (device: UsbPrinterDevice) => ({
  vendorId: toQzUsbHex(device.vendorId),
  productId: toQzUsbHex(device.productId),
});

const outEndpoint = (endpoint: string) => {
  const hex = toQzUsbHex(endpoint);
  const value = Number.parseInt(hex, 16);
  if (!hex || !Number.isFinite(value) || (value & 0x80) !== 0) return null;
  return hex;
};

const VIRTUAL_QUEUE = /pdf|onenote|fax|xps|onenote|microsoft print to pdf/i;

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

  async findPrinters(transport?: PrinterTransport): Promise<string[]> {
    await this.connect();
    try {
      if (transport === "USB") return this.findUsbPrinters();
      const result = await qz.printers.find();
      return uniquePrinterNames(Array.isArray(result) ? result : result ? [result] : []);
    } catch (caught) {
      throw qzError(caught);
    }
  }

  private async onlinePrinterNames(names: string[]): Promise<string[]> {
    const unique = uniquePrinterNames(names);
    if (!unique.length) return [];
    try {
      await qz.printers.startListening(unique);
      const offline = offlinePrinterNames(await qz.printers.getStatus());
      return unique.filter((name) => !offline.has(name));
    } catch {
      return unique;
    } finally {
      await qz.printers.stopListening().catch(() => undefined);
    }
  }

  /** Only USB receipt printers that are plugged in right now. */
  private async findUsbPrinters(): Promise<string[]> {
    const queueNames: string[] = [];
    try {
      queueNames.push(
        ...asList(await qz.printers.details())
          .filter((item) => item.name && /^USB/i.test(item.connection || ""))
          .map((item) => item.name as string)
      );
    } catch {
      // details() is optional on some QZ builds.
    }
    try {
      queueNames.push(
        ...asList(await qz.printers.find()).filter(
          (name) => name && !VIRTUAL_QUEUE.test(name) && isReceiptQueueName(name)
        )
      );
    } catch {
      // find() is optional if details already returned USB queues.
    }
    const liveQueues = await this.onlinePrinterNames(queueNames);

    let devices: string[] = [];
    try {
      devices = asList(await qz.usb.listDevices(false))
        .filter(isReceiptUsbPrinter)
        .map(usbDeviceLabel);
    } catch {
      // Windows USBPRINT drivers often hide the raw device; live queues still count.
    }

    const discovered = uniquePrinterNames([...liveQueues, ...devices]);
    if (discovered.length) return discovered;
    throw new Error(
      "No USB printer is plugged in. Connect the receipt printer to a USB port, then tap Discover."
    );
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
      const leftMatch = Number(usbDeviceMatchesName(left, preferred));
      const rightMatch = Number(usbDeviceMatchesName(right, preferred));
      return rightMatch - leftMatch;
    });
  }

  /**
   * Writes ESC/POS straight to a printer that is plugged in now. This is the
   * last resort: a printer with its Windows driver installed is owned by
   * usbprint.sys, so QZ cannot claim it and every attempt here fails. The error
   * of the closest attempt is returned so the caller can say why.
   */
  private async printConnectedUsb(
    binding: PrinterBinding,
    data: string
  ): Promise<{ printed: boolean; error?: string }> {
    let devices: UsbPrinterDevice[] = [];
    try {
      devices = this.preferUsbDevices(
        binding,
        asList(await qz.usb.listDevices(false)).filter(
          (device) =>
            isReceiptUsbPrinter(device) ||
            usbDeviceMatchesName(device, binding.deviceName)
        )
      );
    } catch (caught) {
      return { printed: false, error: `QZ could not list USB devices: ${qzError(caught).message}` };
    }
    const selected = devices.filter((device) =>
      usbDeviceMatchesName(device, binding.deviceName)
    );
    if (selected.length) devices = selected;
    if (!devices.length) {
      return {
        printed: false,
        error: `no USB receipt printer is on the bus${
          binding.deviceName ? ` for "${binding.deviceName}"` : ""
        }`,
      };
    }

    const failures: string[] = [];
    for (const device of devices) {
      const ids = qzUsbDevice(device);
      if (!ids.vendorId || !ids.productId) continue;
      const label = usbDeviceLabel(device) || `${ids.vendorId}:${ids.productId}`;
      let interfaces: string[] = [];
      try {
        interfaces = asList(await qz.usb.listInterfaces(ids));
      } catch (caught) {
        failures.push(`${label}: interfaces unreadable (${qzError(caught).message})`);
        continue;
      }
      for (const iface of interfaces) {
        const claimed = { ...ids, interface: toQzUsbHex(iface) || iface };
        try {
          await qz.usb.claimDevice(claimed);
          const endpoints = asList(
            await qz.usb.listEndpoints({
              ...ids,
              interface: claimed.interface,
            })
          );
          const endpoint = endpoints.map(outEndpoint).find(Boolean);
          if (!endpoint) {
            failures.push(`${label}: interface ${iface} has no output endpoint`);
            continue;
          }
          await qz.usb.sendData({
            ...ids,
            endpoint,
            data: { data: escPosHex(data), type: "HEX" },
          });
          return { printed: true };
        } catch (caught) {
          failures.push(`${label}: ${qzError(caught).message}`);
        } finally {
          await qz.usb.releaseDevice(ids).catch(() => undefined);
        }
      }
    }
    return { printed: false, error: failures.slice(0, 2).join("; ") };
  }

  private async listedUsbQueueNames(): Promise<string[]> {
    const names: string[] = [];
    try {
      names.push(
        ...asList(await qz.printers.details())
          .filter((item) => item.name && /^USB/i.test(item.connection || ""))
          .map((item) => item.name as string)
      );
    } catch {
      // details() is optional.
    }
    try {
      names.push(
        ...asList(await qz.printers.find()).filter(
          (name) => name && !VIRTUAL_QUEUE.test(name) && isReceiptQueueName(name)
        )
      );
    } catch {
      // find() is optional.
    }
    return this.onlinePrinterNames(names);
  }

  /** Online USB queues, with a leftover unplugged printer ranked last. */
  private async usbQueueCandidates(binding: PrinterBinding): Promise<PrinterBinding[]> {
    const override = this.usbQueueOverride.get(this.usbOverrideKey(binding));
    let queues: QueueDetail[] = [];
    let devices: UsbPrinterDevice[] = [];
    const listed = await this.listedUsbQueueNames();
    try {
      queues = asList(await qz.printers.details());
    } catch {
      queues = [];
    }
    try {
      devices = asList(await qz.usb.listDevices(false));
    } catch {
      devices = [];
    }
    const usbNames = queues
      .filter((item) => item.name && /^USB/i.test(item.connection || ""))
      .map((item) => item.name as string);
    if (!usbNames.length) {
      const found = listed.filter((name) => !parseUsbDeviceRef(name));
      if (found.length) return found.map((deviceName) => ({ ...binding, deviceName }));
      return parseUsbDeviceRef(binding.deviceName) ? [] : [binding];
    }

    let offline = new Set<string>();
    try {
      await qz.printers.startListening(usbNames);
      offline = offlinePrinterNames(await qz.printers.getStatus());
    } catch {
      offline = new Set();
    } finally {
      await qz.printers.stopListening().catch(() => undefined);
    }

    const ranked = uniquePrinterNames([
      ...listed.filter((name) => !parseUsbDeviceRef(name)),
      ...rankUsbPrintQueues({
        savedName: override || (parseUsbDeviceRef(binding.deviceName) ? undefined : binding.deviceName),
        queues,
        offlineNames: offline,
        connectedDevices: devices,
      }),
    ]);
    if (!ranked.length) {
      if (offline.size) {
        throw new Error(
          "The USB receipt printer is offline. Plug in the printer and try again."
        );
      }
      return parseUsbDeviceRef(binding.deviceName) ? [] : [binding];
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

  private send(binding: PrinterBinding, data: string) {
    return qz.print(this.config(binding), [
      { type: "raw", format: "command", flavor: "hex", data: escPosHex(data) },
    ]);
  }

  /**
   * A USB printer prints through its Windows queue first. A printer with a
   * driver installed is owned by usbprint.sys, so claiming it raw always fails,
   * while the queue prints - and the queue is also what survives a changed USB
   * port or a switched-off printer coming back. Only a printer with no queue at
   * all is written to directly.
   */
  private async printUsb(binding: PrinterBinding, data: string): Promise<void> {
    const problems: string[] = [];
    const candidates = await this.usbQueueCandidates(binding).catch((caught) => {
      problems.push(qzError(caught).message);
      return [] as PrinterBinding[];
    });

    let queueError: Error | null = null;
    for (const target of candidates) {
      try {
        await this.send(target, data);
        this.rememberUsbQueue(binding, target.deviceName);
        return;
      } catch (caught) {
        queueError = qzError(caught);
        problems.push(`${target.deviceName || target.displayName}: ${queueError.message}`);
        // A queue that answers with anything but a "gone/offline" error is not
        // going to print on the next candidate either.
        if (!isRetryableUsbQueueError(queueError.message)) throw queueError;
      }
    }

    const device = await this.printConnectedUsb(binding, data);
    if (device.printed) return;
    if (device.error) problems.push(device.error);

    // A queue that failed keeps its own wording, so the caller can still say
    // "this printer is not installed" the way it did before.
    if (queueError) throw queueError;
    throw new Error(
      `The USB printer "${binding.deviceName || binding.displayName}" is not reachable. ` +
        "Install its driver so Windows owns a print queue for it, name that queue like POS-80, " +
        "then tap Discover and pick the queue. " +
        (problems.length ? `(${problems.join(" | ")})` : "")
    );
  }

  private async printRaw(binding: PrinterBinding, data: string): Promise<void> {
    await this.connect();
    try {
      if (binding.transport === "USB") {
        await this.printUsb(binding, data);
        return;
      }
      await this.send(binding, data);
    } catch (caught) {
      const error = qzError(caught);
      if (/Cannot find printer with name|printer .* not found/i.test(error.message)) {
        if (binding.transport === "USB") {
          throw new Error(
            `USB printer "${binding.deviceName || binding.displayName}" could not be opened. ` +
              "Tap Discover, pick its Windows print queue (name it like POS-80), then Test print again."
          );
        }
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
