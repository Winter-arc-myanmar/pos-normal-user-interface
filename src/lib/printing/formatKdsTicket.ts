import { KdsTicket } from "@/core/domain/entities/Cashier";
import { PrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";

const ESC = "\x1b";
const GS = "\x1d";

/** Fixed heading on every KDS/kitchen slip, instead of the raw order/ticket number. */
const KITCHEN_SLIP_TITLE = "KDS";

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

/** Fixed receipt column width, matching the 32-dash separators. */
const RECEIPT_WIDTH = 32;

/** Amount text for an item row (empty when prices are hidden or missing). */
const itemAmountText = (showPrices: boolean, unitPrice?: string) => {
  if (!showPrices) return "";
  return unitPrice?.trim() || "";
};

/** Left text + right text on one padded line so amounts line up in a column. */
const padRow = (left: string, right: string, width = RECEIPT_WIDTH) =>
  right
    ? `${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`
    : left;

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
  serviceCharge?: string;
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

/** Right-aligned "label ... value" line for receipt totals. */
const totalRow = (label: string, value?: string | null) =>
  value ? `${padRow(label, value)}\n` : "";

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
  lines.forEach((item, index) => {
    const qty = Number(item.quantity);
    const quantity = Number.isFinite(qty) ? String(qty) : item.quantity;
    const amount = itemAmountText(options.showPrices, item.unitPrice);
    const lead = options.qtyFirst
      ? `${quantity} × ${item.name}`
      : `${item.name}  ${quantity} ×`;
    rows.push(padRow(lead, amount));
    const modifiers = modifierLine(item, options.showPrices, options.showModifiers);
    if (modifiers) rows.push(`  ${modifiers}`);
    if (index < lines.length - 1) rows.push("");
  });
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
      const amount = itemAmountText(options.showPrices, item.unitPrice);
      const lead = options.qtyFirst
        ? `${quantity} × ${item.name}`
        : `${item.name}  ${quantity} ×`;
      const extras = [modifierLine(item, options.showPrices, options.showModifiers)]
        .filter(Boolean)
        .join("\n  ");
      return `${itemFont(options.fontSize)}${padRow(lead, amount)}\n${ESC}!\x00${extras ? `  ${extras}\n` : ""}\n`;
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
  return [...totals.entries()].map(([name, total]) => padRow(name, total.toFixed(2)));
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
  if (settings?.other.tableOrRoom && party.tableOrRoom) {
    rows.push(padRow("Table", party.tableOrRoom));
  }
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
      `${KITCHEN_SLIP_TITLE}\n`,
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
      showBreakdown ? totalRow("Subtotal", receipt.subtotal) : "",
      showBreakdown ? totalRow("Discount", receipt.discount) : "",
      showBreakdown ? totalRow("Tax", receipt.tax) : "",
      showBreakdown ? totalRow("Service charge", receipt.serviceCharge) : "",
      showTotal &&
      showBreakdown &&
      (receipt.subtotal || receipt.discount || receipt.tax || receipt.serviceCharge)
        ? "--------------------------------\n"
        : "",
      showTotal ? `${ESC}!\x10${padRow("TOTAL", receipt.total)}\n${ESC}!\x00` : "",
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
  rows.push(KITCHEN_SLIP_TITLE);
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
  if (showBreakdown && receipt.subtotal) rows.push(padRow("Subtotal", receipt.subtotal));
  if (showBreakdown && receipt.discount) rows.push(padRow("Discount", receipt.discount));
  if (showBreakdown && receipt.tax) rows.push(padRow("Tax", receipt.tax));
  if (showBreakdown && receipt.serviceCharge) {
    rows.push(padRow("Service charge", receipt.serviceCharge));
  }
  if (
    showTotal &&
    showBreakdown &&
    (receipt.subtotal || receipt.discount || receipt.tax || receipt.serviceCharge)
  ) {
    rows.push("--------------------------------");
  }
  if (showTotal) rows.push(padRow("TOTAL", receipt.total));
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
