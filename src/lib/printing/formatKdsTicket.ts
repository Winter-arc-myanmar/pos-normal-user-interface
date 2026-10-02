import { KdsTicket } from "@/core/domain/entities/Cashier";
import { PrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";

const ESC = "\x1b";
const GS = "\x1d";

export type PrintPlace = "KDS" | "CHECKOUT" | "FINANCE";

export interface PrintLine {
  name: string;
  quantity: string;
  categoryId?: string;
  categoryName?: string;
  altName?: string;
  unitPrice?: string;
  modifiers?: string;
  modifierPrices?: string;
  remarks?: string;
}

const linePrice = (showPrices: boolean, unitPrice?: string) => {
  const price = unitPrice?.trim();
  return showPrices && price ? `  ${price}` : "";
};

const modifierLine = (item: PrintLine, showPrices: boolean, showModifiers: boolean) => {
  if (!showModifiers || !item.modifiers?.trim()) return "";
  if (!showPrices || !item.modifierPrices) return item.modifiers;
  const names = item.modifiers.split(", ");
  const prices = item.modifierPrices.split(", ");
  return names
    .map((name, index) => {
      const price = prices[index]?.trim();
      return price && price !== "-" ? `${name} +${price}` : name;
    })
    .join(", ");
};

export interface PrintParty {
  outletName?: string;
  address?: string;
  contact?: string;
  cashier?: string;
  serviceType?: string;
  tableOrRoom?: string;
  pickupCode?: string;
  paidAt?: string;
  rounding?: string;
  startTime?: string;
  endTime?: string;
}

export interface KitchenSlip extends PrintParty {
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

export interface SaleReceipt extends PrintParty {
  title: string;
  receiptId?: string;
  lines: PrintLine[];
  subtotal?: string;
  discount?: string;
  tax?: string;
  // extraFee and tip are not print-template fields, so they stay off the voucher.
  // extraFee?: string;
  // tip?: string;
  total: string;
  payments?: Array<{ name: string; amount: string }>;
  startTimeLabel?: string;
  endTimeLabel?: string;
  place?: PrintPlace;
  showLogo?: boolean;
  showPrices?: boolean;
  template?: PrintTemplateSettings;
}

const detail = (label: string, value?: string | null) =>
  value ? `${label}: ${value}\n` : "";

const itemFont = (size?: string) => {
  if (size === "LARGE") return `${ESC}!\x30`;
  if (size === "SMALL") return `${ESC}!\x01`;
  return `${ESC}!\x00`;
};

const plainItemLines = (
  lines: PrintLine[] = [],
  options: {
    showPrices: boolean;
    showModifiers: boolean;
    qtyFirst: boolean;
  }
) => {
  const rows: string[] = [];
  for (const item of lines) {
    const qty = Number(item.quantity);
    const quantity = Number.isFinite(qty) ? String(qty) : item.quantity;
    const price = linePrice(options.showPrices, item.unitPrice);
    const lead = options.qtyFirst ? `${quantity}  ${item.name}` : `${item.name}  ${quantity}`;
    rows.push(`${lead}${price}`);
    const modifiers = modifierLine(item, options.showPrices, options.showModifiers);
    if (modifiers) rows.push(`  ${modifiers}`);
  }
  return rows;
};

const itemLines = (
  lines: PrintLine[] = [],
  options: {
    showPrices: boolean;
    showModifiers: boolean;
    qtyFirst: boolean;
    fontSize?: string;
  }
) =>
  lines
    .map((item) => {
      const qty = Number(item.quantity);
      const quantity = Number.isFinite(qty) ? String(qty) : item.quantity;
      const price = linePrice(options.showPrices, item.unitPrice);
      const lead = options.qtyFirst ? `${quantity}  ${item.name}` : `${item.name}  ${quantity}`;
      const extras = [modifierLine(item, options.showPrices, options.showModifiers)]
        .filter(Boolean)
        .join("\n  ");
      return `${itemFont(options.fontSize)}${lead}${price}\n${ESC}!\x00${extras ? `  ${extras}\n` : ""}`;
    })
    .join("");

const categorySubtotalRows = (lines: PrintLine[] = [], enabled: boolean) => {
  if (!enabled) return [];
  const totals = new Map<string, number>();
  for (const line of lines) {
    const name = line.categoryName || line.categoryId;
    if (!name) continue;
    const qty = Number(line.quantity);
    const price = Number(line.unitPrice);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) continue;
    totals.set(name, (totals.get(name) || 0) + qty * price);
  }
  return [...totals.entries()].map(([name, total]) => `${name}  ${total.toFixed(2)}`);
};

const sessionTimeRows = (receipt: SaleReceipt) => {
  const rows: string[] = [];
  if (receipt.startTime) {
    rows.push(`${receipt.startTimeLabel || "Start time"}: ${receipt.startTime}`);
  }
  if (receipt.endTime) {
    rows.push(`${receipt.endTimeLabel || "End time"}: ${receipt.endTime}`);
  }
  return rows;
};

const partyRows = (
  settings: PrintTemplateSettings | undefined,
  party: PrintParty,
  showOrderNumber: boolean,
  orderNumber?: string
) => {
  const rows: string[] = [];
  if (showOrderNumber && orderNumber) rows.push(orderNumber);
  if (settings?.other.serviceType && party.serviceType) rows.push(party.serviceType);
  if (settings?.other.tableOrRoom && party.tableOrRoom) rows.push(party.tableOrRoom);
  if (settings?.other.cashier && party.cashier) rows.push(party.cashier);
  if (settings?.other.pickupCode && party.pickupCode) rows.push(party.pickupCode);
  return rows;
};

const headerRows = (settings: PrintTemplateSettings | undefined, party: PrintParty) => {
  const rows: string[] = [];
  if (settings?.header.outletName && party.outletName) rows.push(party.outletName);
  return rows;
};

const showsPrice = (settings?: PrintTemplateSettings, fallback = false) =>
  settings ? settings.item.price : fallback;

// 48-dot line spacing is taller than the 24-dot font, so glyphs are not clipped.
const lineSpacing = `${ESC}3\x30`;
const bottomMargin = "\n".repeat(6);

const wrap = (body: string) =>
  [`${ESC}@`, lineSpacing, body, bottomMargin, `${GS}V\x00`].join("");

export function formatReceiptDateTime(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString();
}

export function sessionPrintTimes(
  session?: { openedAt?: string | null; closedAt?: string | null } | null,
  endFallback?: string | Date | null
): Pick<PrintParty, "startTime" | "endTime"> {
  if (!session?.openedAt) return {};
  const endValue =
    session.closedAt ||
    (endFallback instanceof Date ? endFallback.toISOString() : endFallback);
  return {
    startTime: formatReceiptDateTime(session.openedAt),
    endTime: formatReceiptDateTime(endValue),
  };
}

export function formatKitchenSlip(slip: KitchenSlip): string {
  const settings = slip.template;
  const showPrices = showsPrice(settings, false);
  const showOrderNumber = !settings || settings.other.orderNumber;
  const heading = headerRows(settings, slip)
    .map((row) => `${row}\n`)
    .join("");
  const categories = categorySubtotalRows(
    slip.lines,
    Boolean(settings?.item.categorySubtotal)
  )
    .map((row) => `${row}\n`)
    .join("");
  return wrap(
    [
      `${ESC}a\x01`,
      `${ESC}!\x20`,
      `${slip.title}\n`,
      `${ESC}!\x00`,
      slip.status ? `${slip.status}\n` : "",
      heading,
      `${ESC}a\x00`,
      "--------------------------------\n",
      detail("Course", slip.courseType),
      detail("Fired", slip.firedAt),
      detail("Station", slip.stationName || slip.stationId),
      showOrderNumber ? detail("Sales order", slip.orderRef) : "",
      "--------------------------------\n",
      itemLines(slip.lines, {
        showPrices,
        showModifiers: settings ? settings.item.modifiers : true,
        qtyFirst: settings ? settings.item.qtyFirst : true,
        fontSize: settings?.item.fontSize,
      }),
      categories,
      slip.lines?.length ? "--------------------------------\n" : "",
      settings?.other.footerText ? `${ESC}a\x01${settings.other.footerText}\n` : "",
    ].join("")
  );
}

export function formatSaleReceipt(receipt: SaleReceipt): string {
  const place = receipt.place || "CHECKOUT";
  const finance = place === "FINANCE";
  const settings = receipt.template;
  const showPrices = showsPrice(settings, receipt.showPrices !== false);
  const showBreakdown = settings ? settings.bill.amountAfterDiscount : !finance;
  const showTotal = settings ? settings.bill.totalPayment : true;
  const showPayments = settings ? settings.bill.totalPayment : !finance;
  const showOrderNumber = settings ? settings.other.orderNumber : !finance;
  const heading = headerRows(settings, receipt)
    .map((row) => `${row}\n`)
    .join("");
  const meta = [
    ...partyRows(settings, receipt, showOrderNumber, receipt.receiptId),
    ...sessionTimeRows(receipt),
  ]
    .map((row) => `${row}\n`)
    .join("");
  const categories = categorySubtotalRows(
    receipt.lines,
    Boolean(settings?.item.categorySubtotal)
  )
    .map((row) => `${row}\n`)
    .join("");
  const payments = showPayments
    ? (receipt.payments || [])
        .map((payment) => `${payment.name}  ${payment.amount}\n`)
        .join("")
    : "";
  return wrap(
    [
      `${ESC}a\x01`,
      `${ESC}!\x20`,
      `${receipt.title}\n`,
      `${ESC}!\x00`,
      heading,
      `${ESC}a\x00`,
      "--------------------------------\n",
      meta,
      meta ? "--------------------------------\n" : "",
      itemLines(receipt.lines, {
        showPrices,
        showModifiers: settings ? settings.item.modifiers : !finance,
        qtyFirst: settings ? settings.item.qtyFirst : true,
        fontSize: settings?.item.fontSize,
      }),
      categories,
      "--------------------------------\n",
      showBreakdown ? detail("Subtotal", receipt.subtotal) : "",
      showBreakdown ? detail("Discount", receipt.discount) : "",
      showBreakdown ? detail("Tax", receipt.tax) : "",
      // Print template does not support extra fee or tip.
      // showExtraFee ? detail("Extra fee", receipt.extraFee) : "",
      // showTip ? detail("Tip", receipt.tip) : "",
      showTotal ? `${ESC}!\x10TOTAL  ${receipt.total}\n${ESC}!\x00` : "",
      payments,
      settings?.bill.payTime && receipt.paidAt ? `${receipt.paidAt}\n` : "",
      settings?.other.footerText ? `${ESC}a\x01${settings.other.footerText}\n` : "",
    ].join("")
  );
}

export function kdsTicketPrintLines(ticket: KdsTicket): PrintLine[] {
  if (ticket.lines?.length) {
    return ticket.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      categoryId: line.categoryId,
      modifiers: line.modifiers,
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
  const showOrderNumber = !settings || settings.other.orderNumber;
  const rows: string[] = [];
  rows.push(slip.title);
  if (slip.status) rows.push(slip.status);
  rows.push(...headerRows(settings, slip));
  rows.push("--------------------------------");
  if (slip.courseType) rows.push(`Course: ${slip.courseType}`);
  if (slip.firedAt) rows.push(`Fired: ${slip.firedAt}`);
  if (slip.stationName || slip.stationId) {
    rows.push(`Station: ${slip.stationName || slip.stationId}`);
  }
  if (showOrderNumber && slip.orderRef) rows.push(`Sales order: ${slip.orderRef}`);
  rows.push("--------------------------------");
  rows.push(
    ...plainItemLines(slip.lines, {
      showPrices,
      showModifiers: settings ? settings.item.modifiers : true,
      qtyFirst: settings ? settings.item.qtyFirst : true,
    })
  );
  rows.push(
    ...categorySubtotalRows(
      slip.lines,
      Boolean(settings?.item.categorySubtotal)
    )
  );
  if (slip.lines?.length) rows.push("--------------------------------");
  if (settings?.other.footerText) rows.push(settings.other.footerText);
  return rows;
}

export function buildSaleReceiptLines(receipt: SaleReceipt): string[] {
  const place = receipt.place || "CHECKOUT";
  const finance = place === "FINANCE";
  const settings = receipt.template;
  const showPrices = showsPrice(settings, receipt.showPrices !== false);
  const showBreakdown = settings ? settings.bill.amountAfterDiscount : !finance;
  const showTotal = settings ? settings.bill.totalPayment : true;
  const showPayments = settings ? settings.bill.totalPayment : !finance;
  const showOrderNumber = settings ? settings.other.orderNumber : !finance;
  const meta = [
    ...partyRows(settings, receipt, showOrderNumber, receipt.receiptId),
    ...sessionTimeRows(receipt),
  ];
  const rows: string[] = [];
  rows.push(receipt.title);
  rows.push(...headerRows(settings, receipt));
  rows.push("--------------------------------");
  if (meta.length) {
    rows.push(...meta);
    rows.push("--------------------------------");
  }
  rows.push(
    ...plainItemLines(receipt.lines, {
      showPrices,
      showModifiers: settings ? settings.item.modifiers : !finance,
      qtyFirst: settings ? settings.item.qtyFirst : true,
    })
  );
  rows.push(
    ...categorySubtotalRows(
      receipt.lines,
      Boolean(settings?.item.categorySubtotal)
    )
  );
  rows.push("--------------------------------");
  if (showBreakdown && receipt.subtotal) rows.push(`Subtotal: ${receipt.subtotal}`);
  if (showBreakdown && receipt.discount) rows.push(`Discount: ${receipt.discount}`);
  if (showBreakdown && receipt.tax) rows.push(`Tax: ${receipt.tax}`);
  // Print template does not support extra fee or tip.
  // if (showExtraFee && receipt.extraFee) rows.push(`Extra fee: ${receipt.extraFee}`);
  // if (showTip && receipt.tip) rows.push(`Tip: ${receipt.tip}`);
  if (showTotal) rows.push(`TOTAL  ${receipt.total}`);
  if (showPayments) {
    for (const payment of receipt.payments || []) {
      rows.push(`${payment.name}  ${payment.amount}`);
    }
  }
  if (settings?.bill.payTime && receipt.paidAt) rows.push(receipt.paidAt);
  if (settings?.other.footerText) rows.push(settings.other.footerText);
  return rows;
}

export function buildPrinterTestLines(name: string): string[] {
  return ["PRINTER TEST", name, "Connection verified", new Date().toLocaleString()];
}
