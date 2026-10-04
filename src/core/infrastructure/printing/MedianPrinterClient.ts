import { KdsTicket } from "../../domain/entities/Cashier";
import { PrinterBinding, PrinterTransport } from "@/lib/pos/printerBindingStorage";
import { escPosToBase64 } from "@/lib/printing/escPosBytes";
import {
  callPosPrinter,
  hasNativePrinterBridge,
  hasPluginMethod,
  nativePrinterNames,
  type MedianDiscoverResult,
  type MedianPosPrinterLike,
} from "@/lib/printing/webPrinterTransports";
import type { IPrinterClient } from "./IPrinterClient";
import {
  formatKdsTicket,
  formatKitchenSlip,
  formatPrinterTest,
  formatSaleReceipt,
  KitchenSlip,
  SaleReceipt,
} from "@/lib/printing/formatKdsTicket";

declare global {
  interface Window {
    median?: {
      posPrinter?: MedianPosPrinterLike;
    };
    gonative?: {
      posPrinter?: MedianPosPrinterLike;
    };
  }
}

const pluginError = () =>
  new Error(
    "Android direct printing requires the POS printer native plugin (window.median.posPrinter). Enable the plugin and rebuild the Android app."
  );

/** Polls until the Median JavaScript bridge injects `posPrinter` (or times out). */
const waitForPlugin = async (timeoutMs = 5000): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (hasNativePrinterBridge()) return;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  throw pluginError();
};

export class MedianPrinterClient implements IPrinterClient {
  private connected = false;

  isConnected(): boolean {
    return this.connected && hasNativePrinterBridge();
  }

  async connect(): Promise<void> {
    await waitForPlugin();
    if (hasPluginMethod("connect")) await callPosPrinter("connect", {});
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (hasPluginMethod("disconnect")) {
      await callPosPrinter("disconnect", {}).catch(() => undefined);
    }
    this.connected = false;
  }

  async findPrinters(transport?: PrinterTransport): Promise<string[]> {
    await this.connect();
    const result = await callPosPrinter<MedianDiscoverResult>("discover", {
      transport,
    });
    return nativePrinterNames(result);
  }

  private async printRaw(binding: PrinterBinding, data: string): Promise<void> {
    await this.connect();
    if (binding.transport === "NETWORK" && (!binding.host || !binding.port)) {
      throw new Error("Network printer IP address and port are required");
    }
    if (binding.transport !== "NETWORK" && !binding.deviceName) {
      throw new Error("Select a printer");
    }
    await callPosPrinter("printRaw", {
      transport: binding.transport,
      host: binding.host,
      port: binding.port,
      deviceId: binding.deviceName,
      dataBase64: escPosToBase64(data),
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
