import { KdsTicket } from "@/core/domain/entities/Cashier";
import { PrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";

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
  stationName?: string;
  orderRef?: string;
  lines?: PrintLine[];
  template?: PrintTemplateSettings;
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
  template?: PrintTemplateSettings;
}

const detail = (label: string, value?: string | null) =>
  value ? `${label}: ${value}\n` : "";

const itemFont = (size?: string) => {
  if (size === "LARGE") return `${ESC}!\x30`;
  if (size === "SMALL") return `${ESC}!\x00`;
  return `${ESC}!\x00`;
};

const plainItemLines = (
  lines: PrintLine[] = [],
  options: {
    showPrices: boolean;
    showModifiers: boolean;
    showRemarks: boolean;
    qtyFirst: boolean;
  }
) => {
  const rows: string[] = [];
  for (const item of lines) {
    const qty = Number(item.quantity);
    const quantity = Number.isFinite(qty) ? String(qty) : item.quantity;
    const price = options.showPrices && item.unitPrice ? `  ${item.unitPrice}` : "";
    const lead = options.qtyFirst ? `${quantity}  ${item.name}` : `${item.name}  ${quantity}`;
    rows.push(`${lead}${price}`);
    if (options.showModifiers && item.modifiers) rows.push(`  ${item.modifiers}`);
    if (options.showRemarks && item.remarks) rows.push(`  ${item.remarks}`);
  }
  return rows;
};

const itemLines = (
  lines: PrintLine[] = [],
  options: {
    showPrices: boolean;
    showModifiers: boolean;
    showRemarks: boolean;
    qtyFirst: boolean;
    fontSize?: string;
  }
) =>
  lines
    .map((item) => {
      const qty = Number(item.quantity);
      const quantity = Number.isFinite(qty) ? String(qty) : item.quantity;
      const price = options.showPrices && item.unitPrice ? `  ${item.unitPrice}` : "";
      const lead = options.qtyFirst ? `${quantity}  ${item.name}` : `${item.name}  ${quantity}`;
      const extras = [
        options.showModifiers ? item.modifiers : "",
        options.showRemarks ? item.remarks : "",
      ]
        .filter(Boolean)
        .join("\n  ");
      return `${itemFont(options.fontSize)}${lead}${price}\n${ESC}!\x00${extras ? `  ${extras}\n` : ""}`;
    })
    .join("");

const showsPrice = (settings?: PrintTemplateSettings, fallback = false) =>
  settings ? settings.item.price && !settings.item.hidePriceOnOrderBill : fallback;

// 48-dot line spacing is taller than the 24-dot font, so glyphs are not clipped.
const lineSpacing = `${ESC}3\x30`;
const bottomMargin = "\n".repeat(6);

const wrap = (body: string) =>
  [`${ESC}@`, lineSpacing, body, bottomMargin, `${GS}V\x00`].join("");

export function formatKitchenSlip(slip: KitchenSlip): string {
  const settings = slip.template;
  const showPrices = showsPrice(settings, false);
  return wrap(
    [
      `${ESC}a\x01`,
      settings?.header.logo ? "LOGO\n" : "",
      `${ESC}!\x20`,
      `${slip.title}\n`,
      `${ESC}!\x00`,
      slip.status ? `${slip.status}\n` : "",
      `${ESC}a\x00`,
      "--------------------------------\n",
      detail("Course", slip.courseType),
      detail("Fired", slip.firedAt),
      detail("Station", slip.stationName || slip.stationId),
      !settings || settings.other.orderNumber
        ? detail("Sales order", slip.orderRef)
        : "",
      "--------------------------------\n",
      itemLines(slip.lines, {
        showPrices,
        showModifiers: settings ? settings.item.modifiers : true,
        showRemarks: settings ? settings.item.productRemarks : true,
        qtyFirst: settings ? settings.item.qtyFirst : true,
        fontSize: settings?.item.fontSize,
      }),
      slip.lines?.length ? "--------------------------------\n" : "",
      settings?.other.footerText ? `${settings.other.footerText}\n` : "",
    ].join("")
  );
}

export function formatSaleReceipt(receipt: SaleReceipt): string {
  const place = receipt.place || "CHECKOUT";
  const finance = place === "FINANCE";
  const settings = receipt.template;
  const showLogo = settings
    ? settings.header.logo
    : finance
      ? false
      : receipt.showLogo !== false;
  const showPrices = showsPrice(settings, receipt.showPrices !== false);
  const showBreakdown = settings ? settings.bill.amountAfterDiscount : !finance;
  const showTotal = settings ? settings.bill.totalPayment : true;
  const showPayments = settings ? settings.bill.totalPayment : !finance;
  const showOrderNumber = settings ? settings.other.orderNumber : !finance;
  const payments = showPayments
    ? (receipt.payments || [])
        .map((payment) => `${payment.name}  ${payment.amount}\n`)
        .join("")
    : "";
  return wrap(
    [
      `${ESC}a\x01`,
      showLogo ? "LOGO\n" : "",
      `${ESC}!\x20`,
      `${receipt.title}\n`,
      `${ESC}!\x00`,
      showOrderNumber && receipt.receiptId ? `${receipt.receiptId}\n` : "",
      `${ESC}a\x00`,
      "--------------------------------\n",
      itemLines(receipt.lines, {
        showPrices,
        showModifiers: settings ? settings.item.modifiers : !finance,
        showRemarks: settings ? settings.item.productRemarks : !finance,
        qtyFirst: settings ? settings.item.qtyFirst : true,
        fontSize: settings?.item.fontSize,
      }),
      "--------------------------------\n",
      showBreakdown ? detail("Subtotal", receipt.subtotal) : "",
      showBreakdown ? detail("Discount", receipt.discount) : "",
      showBreakdown ? detail("Tax", receipt.tax) : "",
      showBreakdown ? detail("Tip", receipt.tip) : "",
      showTotal ? `${ESC}!\x10TOTAL  ${receipt.total}\n${ESC}!\x00` : "",
      payments,
      settings?.other.footerText ? `${settings.other.footerText}\n` : "",
    ].join("")
  );
}

export function kdsTicketPrintLines(ticket: KdsTicket): PrintLine[] {
  if (ticket.lines?.length) {
    return ticket.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      categoryId: line.categoryId,
    }));
  }
  return (ticket.kdsTicketLines || []).map((line) => ({
    name: line.productName || "Item",
    quantity: line.quantity || "1",
    modifiers: line.kitchenModifiers,
  }));
}

export function formatKdsTicket(ticket: KdsTicket): string {
  return formatKitchenSlip({
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

export function formatPrinterTest(name: string): string {
  return [
    `${ESC}@`,
    lineSpacing,
    `${ESC}a\x01`,
    `${ESC}!\x20`,
    "PRINTER TEST\n",
    `${ESC}!\x00`,
    `${name}\n`,
    "Connection verified\n",
    `${new Date().toLocaleString()}`,
    bottomMargin,
    `${GS}V\x00`,
  ].join("");
}

export function buildKitchenSlipLines(slip: KitchenSlip): string[] {
  const settings = slip.template;
  const showPrices = showsPrice(settings, false);
  const rows: string[] = [];
  if (settings?.header.logo) rows.push("LOGO");
  rows.push(slip.title);
  if (slip.status) rows.push(slip.status);
  rows.push("--------------------------------");
  if (slip.courseType) rows.push(`Course: ${slip.courseType}`);
  if (slip.firedAt) rows.push(`Fired: ${slip.firedAt}`);
  if (slip.stationName || slip.stationId) {
    rows.push(`Station: ${slip.stationName || slip.stationId}`);
  }
  if ((!settings || settings.other.orderNumber) && slip.orderRef) {
    rows.push(`Sales order: ${slip.orderRef}`);
  }
  rows.push("--------------------------------");
  rows.push(
    ...plainItemLines(slip.lines, {
      showPrices,
      showModifiers: settings ? settings.item.modifiers : true,
      showRemarks: settings ? settings.item.productRemarks : true,
      qtyFirst: settings ? settings.item.qtyFirst : true,
    })
  );
  if (slip.lines?.length) rows.push("--------------------------------");
  if (settings?.other.footerText) rows.push(settings.other.footerText);
  return rows;
}

export function buildSaleReceiptLines(receipt: SaleReceipt): string[] {
  const place = receipt.place || "CHECKOUT";
  const finance = place === "FINANCE";
  const settings = receipt.template;
  const showLogo = settings
    ? settings.header.logo
    : finance
      ? false
      : receipt.showLogo !== false;
  const showPrices = showsPrice(settings, receipt.showPrices !== false);
  const showBreakdown = settings ? settings.bill.amountAfterDiscount : !finance;
  const showTotal = settings ? settings.bill.totalPayment : true;
  const showPayments = settings ? settings.bill.totalPayment : !finance;
  const showOrderNumber = settings ? settings.other.orderNumber : !finance;
  const rows: string[] = [];
  if (showLogo) rows.push("LOGO");
  rows.push(receipt.title);
  if (showOrderNumber && receipt.receiptId) rows.push(receipt.receiptId);
  rows.push("--------------------------------");
  rows.push(
    ...plainItemLines(receipt.lines, {
      showPrices,
      showModifiers: settings ? settings.item.modifiers : !finance,
      showRemarks: settings ? settings.item.productRemarks : !finance,
      qtyFirst: settings ? settings.item.qtyFirst : true,
    })
  );
  rows.push("--------------------------------");
  if (showBreakdown && receipt.subtotal) rows.push(`Subtotal: ${receipt.subtotal}`);
  if (showBreakdown && receipt.discount) rows.push(`Discount: ${receipt.discount}`);
  if (showBreakdown && receipt.tax) rows.push(`Tax: ${receipt.tax}`);
  if (showBreakdown && receipt.tip) rows.push(`Tip: ${receipt.tip}`);
  if (showTotal) rows.push(`TOTAL  ${receipt.total}`);
  if (showPayments) {
    for (const payment of receipt.payments || []) {
      rows.push(`${payment.name}  ${payment.amount}`);
    }
  }
  if (settings?.other.footerText) rows.push(settings.other.footerText);
  return rows;
}

export function buildPrinterTestLines(name: string): string[] {
  return ["PRINTER TEST", name, "Connection verified", new Date().toLocaleString()];
}
