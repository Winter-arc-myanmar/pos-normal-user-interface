import { KdsTicket } from "../../domain/entities/Cashier";
import {
  PrinterBinding,
  PrinterTransport,
  savePrinterBinding,
} from "@/lib/pos/printerBindingStorage";
import { escPosToBase64 } from "@/lib/printing/escPosBytes";
import {
  formatKdsTicket,
  formatKitchenSlip,
  formatPrinterTest,
  formatSaleReceipt,
  KitchenSlip,
  SaleReceipt,
} from "@/lib/printing/formatKdsTicket";
import { isReceiptQueueName } from "@/lib/printing/usbPrintTarget";
import {
  callPrintAgent,
  isPrintAgentAvailable,
  PRINT_AGENT_UNAVAILABLE,
  type AgentCleanupReport,
  type AgentPrinter,
  type AgentPrintReport,
} from "@/lib/printing/printAgent";
import type { IPrinterClient } from "./IPrinterClient";

/**
 * Ordering for the Settings dropdown: a connected queue that reads like a
 * receipt printer first, then any other connected queue, then leftovers. Every
 * queue is listed — the old keyword filter is what forced operators to rename
 * their printer before it could be found.
 */
export const rankAgentPrinterNames = (printers: AgentPrinter[]): string[] => {
  const rank = (printer: AgentPrinter): number => {
    if (printer.stale) return 2;
    return isReceiptQueueName(printer.name) ? 0 : 1;
  };
  return [...printers]
    .sort((left, right) => {
      const delta = rank(left) - rank(right);
      return delta !== 0 ? delta : left.name.localeCompare(right.name);
    })
    .map((printer) => printer.name)
    .filter(Boolean);
};

/**
 * Prints through the desktop agent: a loopback HTTP call to a Windows service
 * that owns the spooler, raw TCP and Bluetooth COM ports.
 */
export class HttpPrintAgentClient implements IPrinterClient {
  private ready = false;
  private tenantId = "";
  private registerId = "";

  isConnected(): boolean {
    return this.ready && isPrintAgentAvailable();
  }

  /** Remembers the register so a renamed queue can be saved back silently. */
  configureScope(tenantId: string, registerId: string): void {
    this.tenantId = tenantId;
    this.registerId = registerId;
  }

  async connect(): Promise<void> {
    if (!isPrintAgentAvailable()) throw new Error(PRINT_AGENT_UNAVAILABLE);
    this.ready = true;
  }

  async disconnect(): Promise<void> {
    this.ready = false;
  }

  async findPrinters(transport?: PrinterTransport): Promise<string[]> {
    if (!transport) return [];
    const result = await callPrintAgent<{ printers?: AgentPrinter[] }>(
      `/v1/printers?transport=${encodeURIComponent(transport)}`
    );
    const printers = result.printers || [];
    if (transport === "USB") return rankAgentPrinterNames(printers);
    return printers.map((printer) => printer.name).filter(Boolean);
  }

  /** Removes stale print queues; the agent must be running elevated. */
  cleanup(): Promise<AgentCleanupReport> {
    return callPrintAgent<AgentCleanupReport>("/v1/admin/cleanup", {}, {
      timeoutMs: 15000,
    });
  }

  private async printRaw(binding: PrinterBinding, data: string): Promise<void> {
    const report = await callPrintAgent<AgentPrintReport>(
      "/v1/print",
      {
        jobId: binding.id,
        transport: binding.transport,
        printerId: binding.hardwareId,
        deviceId: binding.deviceName,
        host: binding.host,
        port: binding.port,
        dataBase64: escPosToBase64(data),
        encoding: "base64",
        timeoutMs: 15000,
      },
      { timeoutMs: 20000 }
    );

    // Windows re-created the queue under another name; keep the binding in step
    // so the next job is a direct hit and the operator never sees the change.
    if (report.rebound && report.printer && this.tenantId) {
      savePrinterBinding(this.tenantId, this.registerId, {
        ...binding,
        deviceName: report.printer.name,
        hardwareId: report.printer.id,
        portName: report.printer.port,
      });
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

export const httpPrintAgentClient = new HttpPrintAgentClient();
