import { KdsTicket } from "../../domain/entities/Cashier";
import { PrinterBinding, PrinterTransport } from "@/lib/pos/printerBindingStorage";
import { KitchenSlip, SaleReceipt } from "@/lib/printing/formatKdsTicket";

export interface IPrinterClient {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  findPrinters(transport?: PrinterTransport): Promise<string[]>;
  testPrint(binding: PrinterBinding): Promise<void>;
  printKdsTicket(binding: PrinterBinding, ticket: KdsTicket): Promise<void>;
  printKitchen(binding: PrinterBinding, slip: KitchenSlip): Promise<void>;
  printReceipt(binding: PrinterBinding, receipt: SaleReceipt): Promise<void>;
}
