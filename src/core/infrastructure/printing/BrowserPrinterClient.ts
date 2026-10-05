import { KdsTicket } from "../../domain/entities/Cashier";
import { PrinterBinding, PrinterTransport } from "@/lib/pos/printerBindingStorage";
import { printLinesWithBrowserDialog } from "@/lib/printing/documentPrint";
import {
  buildKitchenSlipLines,
  buildPrinterTestLines,
  buildSaleReceiptLines,
  formatKitchenSlip,
  kdsTicketPrintLines,
  formatPrinterTest,
  formatSaleReceipt,
  KitchenSlip,
  SaleReceipt,
} from "@/lib/printing/formatKdsTicket";
import { canSendRawEscPos } from "@/lib/printing/printerCapabilities";
import {
  callPosPrinter,
  hasNativePrinterBridge,
  hasPluginMethod,
  isWebBluetoothSupported,
  isWebUsbSupported,
  listWebUsbPrinters,
  nativePrinterNames,
  printLanTcp,
  printMedianRaw,
  printWebBluetooth,
  printWebUsb,
  requestWebBluetoothPrinter,
  requestWebUsbPrinter,
  type MedianDiscoverResult,
} from "@/lib/printing/webPrinterTransports";
import { isBrowserPrinting } from "./PrinterClient";
import type { IPrinterClient } from "./IPrinterClient";

export class BrowserPrinterClient implements IPrinterClient {
  private ready = false;

  isConnected(): boolean {
    return this.ready || hasNativePrinterBridge() || isBrowserPrinting();
  }

  configureScope(_tenantId: string, _registerId: string) {
    // Reserved for future per-register mobile print options.
  }

  async connect(): Promise<void> {
    if (hasPluginMethod("connect")) {
      await callPosPrinter("connect", {});
    }
    this.ready = true;
  }

  async disconnect(): Promise<void> {
    if (hasPluginMethod("disconnect")) {
      await callPosPrinter("disconnect", {}).catch(() => undefined);
    }
    this.ready = false;
  }

  async findPrinters(transport?: PrinterTransport): Promise<string[]> {
    await this.connect();
    if (hasNativePrinterBridge()) {
      const result = await callPosPrinter<MedianDiscoverResult>("discover", {
        transport,
      });
      return nativePrinterNames(result);
    }
    if (transport === "BLUETOOTH" && isWebBluetoothSupported()) {
      return requestWebBluetoothPrinter();
    }
    if (transport === "USB" && isWebUsbSupported()) {
      const paired = await listWebUsbPrinters();
      if (paired.length) return paired;
      return requestWebUsbPrinter();
    }
    return [];
  }

  private async printRaw(binding: PrinterBinding, data: string): Promise<void> {
    await this.connect();
    if (hasNativePrinterBridge()) {
      await printMedianRaw({
        transport: binding.transport,
        host: binding.host,
        port: binding.port,
        deviceId: binding.deviceName,
        data,
      });
      return;
    }

    if (binding.transport === "NETWORK") {
      if (!binding.host || !binding.port) {
        throw new Error("Network printer IP address and port are required");
      }
      await printLanTcp(binding.host, binding.port, data);
      return;
    }

    if (binding.transport === "USB") {
      if (!binding.deviceName) throw new Error("Select a USB printer");
      await printWebUsb(binding.deviceName, data);
      return;
    }

    if (binding.transport === "BLUETOOTH") {
      await printWebBluetooth(binding.deviceName || "", data);
      return;
    }

    throw new Error("Unsupported printer connection");
  }

  private async printWithFallback(
    binding: PrinterBinding,
    escPos: string,
    pdfLines: string[],
    pdfTitle: string
  ): Promise<void> {
    if (canSendRawEscPos(binding)) {
      try {
        await this.printRaw(binding, escPos);
        return;
      } catch (caught) {
        if (!isBrowserPrinting()) throw caught;
      }
    }
    await printLinesWithBrowserDialog(pdfLines, pdfTitle);
  }

  testPrint(binding: PrinterBinding): Promise<void> {
    return this.printWithFallback(
      binding,
      formatPrinterTest(binding.displayName),
      buildPrinterTestLines(binding.displayName),
      "printer-test"
    );
  }

  printKdsTicket(binding: PrinterBinding, ticket: KdsTicket): Promise<void> {
    return this.printKitchen(binding, {
      title: ticket.ticketNumber || ticket.id,
      status: ticket.status,
      courseType: ticket.courseType,
      firedAt: ticket.firedAt,
      stationId: ticket.stationId || ticket.station?.id,
      stationName: ticket.station?.name,
      orderRef: ticket.salesOrderId,
      lines: kdsTicketPrintLines(ticket),
    });
  }

  printKitchen(binding: PrinterBinding, slip: KitchenSlip): Promise<void> {
    const escPos = formatKitchenSlip(slip);
    return this.printWithFallback(
      binding,
      escPos,
      buildKitchenSlipLines(slip),
      slip.title || "kitchen"
    );
  }

  printReceipt(binding: PrinterBinding, receipt: SaleReceipt): Promise<void> {
    const escPos = formatSaleReceipt(receipt);
    return this.printWithFallback(
      binding,
      escPos,
      buildSaleReceiptLines(receipt),
      receipt.title || "receipt"
    );
  }
}

export const browserPrinterClient = new BrowserPrinterClient();
