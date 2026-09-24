import { KdsTicket } from "@/core/domain/entities/Cashier";

const ESC = "\x1b";
const GS = "\x1d";

export type PrintPlace = "KDS" | "CHECKOUT" | "FINANCE";

export interface PrintLine {
  name: string;
  quantity: string;
  categoryId?: string;
  unitPrice?: string;
  modifiers?: string;
  remarks?: string;
}

export interface KitchenSlip {
  title: string;
  status?: string;
  courseType?: string;
  firedAt?: string;
  stationId?: string;
  orderRef?: string;
  lines?: PrintLine[];
}

export interface SaleReceipt {
  title: string;
  receiptId?: string;
  lines: PrintLine[];
  subtotal?: string;
  discount?: string;
  tax?: string;
  tip?: string;
  total: string;
  payments?: Array<{ name: string; amount: string }>;
  place?: PrintPlace;
  showLogo?: boolean;
  showPrices?: boolean;
}

const detail = (label: string, value?: string | null) =>
  value ? `${label}: ${value}\n` : "";

const itemLines = (lines: PrintLine[] = [], showPrices = false) =>
  lines
    .map((item) => {
      const qty = Number(item.quantity);
      const quantity = Number.isFinite(qty) ? String(qty) : item.quantity;
      const price = showPrices && item.unitPrice ? `  ${item.unitPrice}` : "";
      const extras = [item.modifiers, item.remarks].filter(Boolean).join("\n  ");
      return `${quantity}  ${item.name}${price}\n${extras ? `  ${extras}\n` : ""}`;
    })
    .join("");

const wrap = (body: string) =>
  [`${ESC}@`, body, "\n\n", `${GS}V\x00`].join("");

export function formatKitchenSlip(slip: KitchenSlip): string {
  return wrap(
    [
      `${ESC}a\x01`,
      `${ESC}!\x20`,
      `${slip.title}\n`,
      `${ESC}!\x00`,
      slip.status ? `${slip.status}\n` : "",
      `${ESC}a\x00`,
      "--------------------------------\n",
      detail("Course", slip.courseType),
      detail("Fired", slip.firedAt),
      detail("Station", slip.stationId),
      detail("Sales order", slip.orderRef),
      "--------------------------------\n",
      itemLines(slip.lines, false),
      slip.lines?.length ? "--------------------------------\n" : "",
    ].join("")
  );
}

export function formatSaleReceipt(receipt: SaleReceipt): string {
  const place = receipt.place || "CHECKOUT";
  const finance = place === "FINANCE";
  const showLogo = finance ? false : receipt.showLogo !== false;
  const showPrices = receipt.showPrices !== false;
  const payments = finance
    ? ""
    : (receipt.payments || [])
        .map((payment) => `${payment.name}  ${payment.amount}\n`)
        .join("");
  return wrap(
    [
      `${ESC}a\x01`,
      showLogo ? "LOGO\n" : "",
      `${ESC}!\x20`,
      `${receipt.title}\n`,
      `${ESC}!\x00`,
      finance ? "" : receipt.receiptId ? `${receipt.receiptId}\n` : "",
      `${ESC}a\x00`,
      "--------------------------------\n",
      itemLines(receipt.lines, showPrices),
      "--------------------------------\n",
      finance ? "" : detail("Subtotal", receipt.subtotal),
      finance ? "" : detail("Discount", receipt.discount),
      finance ? "" : detail("Tax", receipt.tax),
      finance ? "" : detail("Tip", receipt.tip),
      `${ESC}!\x10`,
      `TOTAL  ${receipt.total}\n`,
      `${ESC}!\x00`,
      payments,
    ].join("")
  );
}

export function formatKdsTicket(ticket: KdsTicket): string {
  return formatKitchenSlip({
    title: ticket.ticketNumber || ticket.id,
    status: ticket.status,
    courseType: ticket.courseType,
    firedAt: ticket.firedAt,
    stationId: ticket.stationId,
    orderRef: ticket.salesOrderId,
    lines: ticket.lines,
  });
}

export function formatPrinterTest(name: string): string {
  return [
    `${ESC}@`,
    `${ESC}a\x01`,
    `${ESC}!\x20`,
    "PRINTER TEST\n",
    `${ESC}!\x00`,
    `${name}\n`,
    "Connection verified\n",
    `${new Date().toLocaleString()}\n\n\n`,
    `${GS}V\x00`,
  ].join("");
}
