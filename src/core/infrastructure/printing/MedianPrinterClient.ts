import { KdsTicket } from "../../domain/entities/Cashier";
import { PrinterBinding, PrinterTransport } from "@/lib/pos/printerBindingStorage";
import type { IPrinterClient } from "./IPrinterClient";
import {
  formatKdsTicket,
  formatKitchenSlip,
  formatPrinterTest,
  formatSaleReceipt,
  KitchenSlip,
  SaleReceipt,
} from "@/lib/printing/formatKdsTicket";

interface MedianPrinterPlugin {
  connect?: () => Promise<void>;
  disconnect?: () => Promise<void>;
  discover: (options: {
    transport?: PrinterTransport;
  }) => Promise<
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

declare global {
  interface Window {
    median?: {
      posPrinter?: MedianPrinterPlugin;
    };
  }
}

const pluginError = () =>
  new Error(
    "Android direct printing requires the Median POS Printer native plugin. Enable the plugin and rebuild the Android app."
  );

const waitForPlugin = async (timeoutMs = 5000): Promise<MedianPrinterPlugin> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const plugin = window.median?.posPrinter;
    if (plugin) return plugin;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  throw pluginError();
};

const base64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const deviceNames = (
  result:
    | string[]
    | {
        devices?: Array<string | { id?: string; name?: string }>;
      }
): string[] => {
  const devices = Array.isArray(result) ? result : result.devices || [];
  return devices
    .map((device) =>
      typeof device === "string" ? device : device.id || device.name || ""
    )
    .filter(Boolean);
};

export class MedianPrinterClient implements IPrinterClient {
  private connected = false;

  isConnected(): boolean {
    return this.connected && Boolean(window.median?.posPrinter);
  }

  async connect(): Promise<void> {
    const plugin = await waitForPlugin();
    await plugin.connect?.();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    const plugin = window.median?.posPrinter;
    await plugin?.disconnect?.();
    this.connected = false;
  }

  async findPrinters(transport?: PrinterTransport): Promise<string[]> {
    await this.connect();
    const plugin = await waitForPlugin();
    return deviceNames(await plugin.discover({ transport }));
  }

  private async printRaw(binding: PrinterBinding, data: string): Promise<void> {
    await this.connect();
    if (binding.transport === "NETWORK" && (!binding.host || !binding.port)) {
      throw new Error("Network printer IP address and port are required");
    }
    if (binding.transport !== "NETWORK" && !binding.deviceName) {
      throw new Error("Select a printer");
    }
    const plugin = await waitForPlugin();
    await plugin.printRaw({
      transport: binding.transport,
      host: binding.host,
      port: binding.port,
      deviceId: binding.deviceName,
      dataBase64: base64(data),
      encoding: "base64",
    });
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

export const medianPrinterClient = new MedianPrinterClient();
