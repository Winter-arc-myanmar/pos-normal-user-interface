import { KdsTicket } from "../../domain/entities/Cashier";
import { PrinterBinding, PrinterTransport } from "@/lib/pos/printerBindingStorage";
import { printLinesAsPdf } from "@/lib/printing/documentPrint";
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
  isWebBluetoothSupported,
  isWebUsbSupported,
  listWebUsbPrinters,
  medianPosPrinter,
  printLanTcp,
  printMedianRaw,
  printWebBluetooth,
  printWebUsb,
  requestWebBluetoothPrinter,
  requestWebUsbPrinter,
} from "@/lib/printing/webPrinterTransports";
import { isBrowserPrinting } from "./PrinterClient";
import type { IPrinterClient } from "./IPrinterClient";

export class BrowserPrinterClient implements IPrinterClient {
  private ready = false;

  isConnected(): boolean {
    return this.ready || Boolean(medianPosPrinter()) || isBrowserPrinting();
  }

  configureScope(_tenantId: string, _registerId: string) {
    // Reserved for future per-register mobile print options.
  }

  async connect(): Promise<void> {
    const plugin = medianPosPrinter();
    if (plugin) {
      await plugin.connect?.();
    }
    this.ready = true;
  }

  async disconnect(): Promise<void> {
    await medianPosPrinter()?.disconnect?.();
    this.ready = false;
  }

  async findPrinters(transport?: PrinterTransport): Promise<string[]> {
    await this.connect();
    const plugin = medianPosPrinter();
    if (plugin) {
      const result = await plugin.discover({ transport });
      const devices = Array.isArray(result) ? result : result.devices || [];
      return devices
        .map((device) =>
          typeof device === "string" ? device : device.id || device.name || ""
        )
        .filter(Boolean);
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
    const plugin = medianPosPrinter();
    if (plugin) {
      await printMedianRaw(plugin, {
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
    await printLinesAsPdf(pdfLines, pdfTitle);
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
