import { KdsTicket } from "@/core/domain/entities/Cashier";
import {
  PriceCurrency,
  PrintCompany,
  PrintPaperWidth,
  PrintTemplateSettings,
  PrintTemplateType,
} from "@/core/domain/entities/PrintTemplate";
import { cashierLabel } from "./cashier";
import { inlineIconCommand, PrintIcon, PrintImage, rasterCommand } from "./printImage";

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
  seat?: string;
}

export interface PrintParty {
  company?: PrintCompany | null;
  outletName?: string;
  address?: string;
  /** The phone number, when it is not the company's. */
  contact?: string;
  email?: string;
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
  /** Where the food goes, printed huge: "Table T12", "KTV K3". */
  place?: string;
  /** Under the place: room name, service, guests. */
  placeDetail?: string;
  sentBy?: string;
  lines?: PrintLine[];
  template?: PrintTemplateSettings;
  paperWidth?: PrintPaperWidth;
}

export interface SaleReceipt extends PrintParty {
  title: string;
  receiptId?: string;
  lines: PrintLine[];
  /** Label and value rows above the items, such as a card number. */
  facts?: Array<{ label: string; value: string }>;
  subtotal?: string;
  discount?: string;
  tax?: string;
  serviceCharge?: string;
  // extraFee and tip are not print-template fields, so they stay off the voucher.
  // extraFee?: string;
  // tip?: string;
  /** Labelled amounts above the total, such as a shift's sales and refunds. */
  amounts?: Array<{ label: string; amount: string }>;
  totalLabel?: string;
  total: string;
  payments?: Array<{ name: string; amount: string }>;
  change?: string;
  /** A guest card's balance after this slip. */
  balanceAfter?: string;
  startTimeLabel?: string;
  endTimeLabel?: string;
  place?: PrintPlace;
  /** The company logo as printer dots, printed at the top when the template shows it. */
  logo?: PrintImage | null;
  /** The template to print with, when it is not the one for `place`. */
  templateType?: PrintTemplateType;
  showLogo?: boolean;
  showPrices?: boolean;
  template?: PrintTemplateSettings;
  paperWidth?: PrintPaperWidth;
  /** Totals print as 100,000 MMK or $ 100,000; plain numbers without it. */
  currency?: PriceCurrency;
  /** The closing line; "Thank you!" on a customer's receipt when left out. */
  footer?: string;
}

export type PrintSize = "normal" | "tall" | "wide" | "huge";
export type PrintAlign = "left" | "center" | "right";
type Size = PrintSize;
type Align = PrintAlign;

interface TextStyle {
  align?: Align;
  size?: Size;
  bold?: boolean;
  invert?: boolean;
}

type Row =
  | ({ kind: "text"; text: string } & TextStyle)
  | { kind: "rule"; char: string }
  | { kind: "gap" }
  | { kind: "image"; image: PrintImage }
  | { kind: "contact"; icon: PrintIcon; text: string };

const columnsFor = (paperWidth?: PrintPaperWidth) => (paperWidth === "MM80" ? 48 : 32);

const isWide = (size?: Size) => size === "wide" || size === "huge";

/** Splits text into lines no wider than `width`, breaking between words. */
export function wrapText(text: string, width: number): string[] {
  const limit = Math.max(1, width);
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let rest = word;
      while (rest.length > limit) {
        if (current) {
          lines.push(current);
          current = "";
        }
        lines.push(rest.slice(0, limit));
        rest = rest.slice(limit);
      }
      if (!current) current = rest;
      else if (current.length + 1 + rest.length <= limit) current += ` ${rest}`;
      else {
        lines.push(current);
        current = rest;
      }
    }
    lines.push(current);
  }
  return lines;
}

/** A slip laid out in rows, printed on a thermal printer or as a page. */
class Layout {
  readonly rows: Row[] = [];

  constructor(readonly width: number) {}

  columns(size?: Size) {
    return isWide(size) ? Math.floor(this.width / 2) : this.width;
  }

  line(text: string | undefined | null, style: TextStyle = {}) {
    if (!text?.trim()) return;
    for (const part of wrapText(text.trim(), this.columns(style.size))) {
      this.rows.push({ kind: "text", text: part, ...style });
    }
  }

  /** Text that keeps its leading spaces, wrapped under the same indent. */
  indented(indent: number, text: string | undefined | null, style: TextStyle = {}) {
    if (!text?.trim()) return;
    const pad = " ".repeat(indent);
    for (const part of wrapText(text.trim(), this.columns(style.size) - indent)) {
      this.rows.push({ kind: "text", text: `${pad}${part}`, ...style });
    }
  }

  /** "label ......... value", wrapping the label when the two do not fit. */
  pair(left: string, right: string | undefined | null, style: TextStyle = {}) {
    const columns = this.columns(style.size);
    const value = right?.trim() || "";
    if (!value) return this.line(left, style);
    if (left.length + 1 + value.length <= columns) {
      const gap = " ".repeat(columns - left.length - value.length);
      this.rows.push({ kind: "text", text: `${left}${gap}${value}`, ...style });
      return;
    }
    const room = columns - value.length - 1;
    if (room < 8) {
      this.line(left, style);
      this.line(value, { ...style, align: "right" });
      return;
    }
    const [first, ...rest] = wrapText(left, room);
    this.rows.push({
      kind: "text",
      text: `${first}${" ".repeat(columns - first.length - value.length)}${value}`,
      ...style,
    });
    for (const part of rest) this.rows.push({ kind: "text", text: part, ...style });
  }

  /** A label and its value, left out when there is no value. */
  field(label: string, value: string | undefined | null, style: TextStyle = {}) {
    if (value?.trim()) this.pair(label, value, style);
  }

  rule(char = "-") {
    this.rows.push({ kind: "rule", char });
  }

  image(image: PrintImage | null | undefined) {
    if (image?.width && image.height) this.rows.push({ kind: "image", image });
  }

  /** A phone number or email after its icon, centred. */
  contact(icon: PrintIcon, text: string | undefined | null) {
    if (text?.trim()) this.rows.push({ kind: "contact", icon, text: text.trim() });
  }

  gap() {
    if (this.rows.length && this.rows[this.rows.length - 1].kind !== "gap") {
      this.rows.push({ kind: "gap" });
    }
  }
}

const alignCode: Record<Align, string> = { left: "\x00", center: "\x01", right: "\x02" };

const printMode = (style: TextStyle) =>
  String.fromCharCode(
    (style.bold ? 0x08 : 0) |
      (style.size === "tall" || style.size === "huge" ? 0x10 : 0) |
      (isWide(style.size) ? 0x20 : 0)
  );

const centered = (text: string, columns: number) => {
  const space = Math.max(0, columns - text.length);
  const left = Math.floor(space / 2);
  return `${" ".repeat(left)}${text}${" ".repeat(space - left)}`;
};

// 48-dot line spacing is taller than the 24-dot font, so glyphs are not clipped.
const lineSpacing = `${ESC}3\x30`;
const bottomMargin = "\n".repeat(6);

const toEscPos = (layout: Layout) =>
  [
    `${ESC}@`,
    lineSpacing,
    ...layout.rows.map((row) => {
      if (row.kind === "gap") return "\n";
      if (row.kind === "image") return `${ESC}a\x01${rasterCommand(row.image)}`;
      if (row.kind === "contact") {
        return `${ESC}a\x01${ESC}!\x00${inlineIconCommand(row.icon)} ${row.text}\n`;
      }
      if (row.kind === "rule") {
        return `${ESC}a\x00${ESC}!\x00${row.char.repeat(layout.width)}\n`;
      }
      const text = row.invert ? centered(row.text, layout.columns(row.size)) : row.text;
      return [
        `${ESC}a${alignCode[row.invert ? "left" : row.align || "left"]}`,
        `${ESC}!${printMode(row)}`,
        row.invert ? `${GS}B\x01` : "",
        text,
        row.invert ? `${GS}B\x00` : "",
        "\n",
      ].join("");
    }),
    `${ESC}!\x00${ESC}a\x00`,
    bottomMargin,
    `${GS}V\x00`,
  ].join("");

const contactLabel: Record<PrintIcon, string> = { phone: "Tel", email: "Email" };

const toPlainLines = (layout: Layout) =>
  layout.rows.flatMap((row) => {
    if (row.kind === "image") return [];
    if (row.kind === "contact") {
      return centered(`${contactLabel[row.icon]} ${row.text}`, layout.width).trimEnd();
    }
    if (row.kind === "gap") return "";
    if (row.kind === "rule") return row.char.repeat(layout.width);
    if (row.invert) return centered(`*** ${row.text.trim()} ***`, layout.width);
    if (row.align === "center") return centered(row.text, layout.width).trimEnd();
    if (row.align === "right") return row.text.padStart(layout.width);
    return row.text;
  });

/** A slip as rows to draw on screen, styled as the printer would print them. */
export type SlipPreviewRow =
  | { kind: "text"; text: string; align: PrintAlign; size: PrintSize; bold: boolean; invert: boolean }
  | { kind: "rule"; text: string }
  | { kind: "gap" }
  | { kind: "image"; image: PrintImage }
  | { kind: "contact"; icon: PrintIcon; text: string };

export interface SlipPreview {
  columns: number;
  rows: SlipPreviewRow[];
}

const toPreview = (layout: Layout): SlipPreview => ({
  columns: layout.width,
  rows: layout.rows.map((row): SlipPreviewRow => {
    if (row.kind === "gap" || row.kind === "image" || row.kind === "contact") return row;
    if (row.kind === "rule") return { kind: "rule", text: row.char.repeat(layout.width) };
    return {
      kind: "text",
      text: row.invert ? row.text.trim() : row.text,
      align: row.invert ? "center" : row.align || "left",
      size: row.size || "normal",
      bold: Boolean(row.bold),
      invert: Boolean(row.invert),
    };
  }),
});

/** Money as a receipt shows it: 50350.0000 is "50,350", 12.5 is "12.50". */
export function printMoney(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  const whole = Math.round(amount * 100) % 100 === 0;
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** An amount in the business's money: "100,000 MMK", "$ 100,000", "-$ 2,825". */
export function printAmount(
  value?: string | number | null,
  currency?: PriceCurrency
): string {
  const text = printMoney(value);
  if (!text || !currency || !Number.isFinite(Number(value))) return text;
  const sign = text.startsWith("-") ? "-" : "";
  const digits = sign ? text.slice(1) : text;
  return currency === "USD" ? `${sign}$ ${digits}` : `${sign}${digits} MMK`;
}

const quantityText = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? String(amount) : value;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const twoDigits = (value: number) => String(value).padStart(2, "0");

const parseDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "14:51" */
const clockText = (value?: string | null) => {
  const date = parseDate(value);
  return date ? `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}` : value || "";
};

/** "08 Oct 2026 14:51", in plain letters any printer can show. */
export function formatPrintDate(value: string | Date): string {
  const date = parseDate(value);
  if (!date) return String(value);
  return `${twoDigits(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function formatReceiptDateTime(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  return parseDate(value) ? formatPrintDate(value) : undefined;
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

const modifierRows = (item: PrintLine, showPrices: boolean) => {
  if (!item.modifiers?.trim()) return [];
  const prices = item.modifierPrices?.split(", ") || [];
  return item.modifiers.split(", ").map((name, index) => {
    const price = prices[index]?.trim();
    return showPrices && price && price !== "-" ? `+ ${name} (+${printMoney(price)})` : `+ ${name}`;
  });
};

const kitchenPlace = (slip: KitchenSlip) =>
  slip.place ||
  (slip.tableOrRoom
    ? `Table ${slip.tableOrRoom}`
    : slip.pickupCode
      ? `Pickup ${slip.pickupCode}`
      : undefined);

const kitchenItemSize = (fontSize?: string): Size =>
  fontSize === "LARGE" ? "huge" : fontSize === "SMALL" ? "normal" : "tall";

function kitchenLayout(slip: KitchenSlip): Layout {
  const settings = slip.template;
  const showPrices = settings ? settings.item.price : false;
  const showModifiers = settings ? settings.item.modifiers : true;
  const showOrderNumber = !settings || settings.other.orderNumber;
  const layout = new Layout(columnsFor(slip.paperWidth));

  layout.line((slip.stationName || "Kitchen").toUpperCase(), { bold: true, invert: true });
  if (settings?.header.outletName && slip.outletName) {
    layout.line(slip.outletName, { align: "center" });
  }
  const place = kitchenPlace(slip);
  if (place) {
    layout.gap();
    layout.line(place, { align: "center", size: "huge", bold: true });
  }
  layout.line(slip.placeDetail || slip.serviceType, { align: "center" });
  layout.gap();
  layout.pair(`#${slip.title}`, clockText(slip.firedAt), { bold: true });
  if (showOrderNumber && slip.orderRef && slip.orderRef !== slip.title) {
    layout.line(`Order ${slip.orderRef}`);
  }
  if (slip.courseType) layout.line(`Course ${slip.courseType}`);
  layout.rule("=");

  const lines = slip.lines || [];
  const size = kitchenItemSize(settings?.item.fontSize);
  lines.forEach((item, index) => {
    if (index) layout.gap();
    const quantity = quantityText(item.quantity).padEnd(3);
    const columns = layout.columns(size) - quantity.length;
    const [first, ...rest] = wrapText(item.name.toUpperCase(), columns);
    layout.rows.push({ kind: "text", text: `${quantity}${first}`, size, bold: true });
    for (const part of rest) {
      layout.rows.push({ kind: "text", text: `${" ".repeat(quantity.length)}${part}`, size, bold: true });
    }
    if (settings?.item.bilingual) layout.indented(3, item.altName);
    if (showPrices && item.unitPrice) layout.indented(3, `@ ${printMoney(item.unitPrice)}`);
    if (showModifiers) {
      for (const modifier of modifierRows(item, showPrices)) layout.indented(3, modifier);
    }
    if (item.seat) layout.indented(3, `Seat ${item.seat}`);
    if (item.remarks?.trim()) layout.indented(3, `** ${item.remarks.trim()} **`, { bold: true });
  });
  if (lines.length) layout.rule("=");

  const count = lines.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  if (count) layout.line(`${count} ${count === 1 ? "item" : "items"}`, { bold: true });
  const sender = slip.sentBy || slip.cashier;
  if (sender) layout.line(`Sent by ${sender}`);
  if (settings?.other.footerText) {
    layout.gap();
    layout.line(settings.other.footerText, { align: "center" });
  }
  return layout;
}

const roomServices = new Set(["SPA", "KTV"]);

function receiptLayout(receipt: SaleReceipt): Layout {
  const place = receipt.place || "CHECKOUT";
  const finance = place === "FINANCE";
  const shift = receipt.templateType === "SHIFT";
  const settings = receipt.template;
  const shows = (flag?: boolean) => (settings ? Boolean(flag) : true);
  // A shift report is for the office: its header shows only what its template asks for.
  const headed = (flag?: boolean) => (shift ? Boolean(flag) : shows(flag));
  const showPrices = settings ? settings.item.price : receipt.showPrices !== false;
  const showBreakdown = settings ? settings.bill.amountAfterDiscount : !finance;
  const showTotal = shift || (settings ? settings.bill.totalPayment : true);
  const showPayments = settings ? settings.bill.totalPayment : !finance;
  const showOrderNumber = settings ? settings.other.orderNumber : !finance;
  const showModifiers = settings ? settings.item.modifiers : !finance;
  const qtyFirst = settings ? settings.item.qtyFirst : true;
  const itemSize: Size = settings?.item.fontSize === "LARGE" ? "tall" : "normal";
  const layout = new Layout(columnsFor(receipt.paperWidth));
  const company = finance || (shift && !settings?.header.outletName) ? null : receipt.company;

  if (receipt.showLogo !== false && (settings ? settings.header.logo : !finance && !shift)) {
    layout.image(receipt.logo);
    if (receipt.logo) layout.gap();
  }
  if (company?.name) {
    layout.line(company.name.toUpperCase(), { align: "center", size: "wide", bold: true });
    if (company.legalName && company.legalName !== company.name) {
      layout.line(company.legalName, { align: "center" });
    }
  }
  if (
    (settings ? settings.header.outletName : true) &&
    receipt.outletName &&
    receipt.outletName !== company?.name
  ) {
    layout.line(receipt.outletName, { align: "center", bold: !company?.name });
  }
  if (headed(settings?.header.address)) {
    layout.line(receipt.address || company?.address, { align: "center" });
  }
  if (headed(settings?.header.contact)) layout.contact("phone", receipt.contact || company?.phone);
  if (headed(settings?.header.email)) layout.contact("email", receipt.email || company?.email);
  if (layout.rows.length) layout.rule("=");

  layout.line(receipt.title.toUpperCase(), { align: "center", size: "tall", bold: true });
  layout.gap();
  if (showOrderNumber && receipt.receiptId) layout.field("Receipt No", receipt.receiptId);
  layout.field(
    "Date",
    receipt.paidAt ? formatReceiptDateTime(receipt.paidAt) || receipt.paidAt : formatPrintDate(new Date())
  );
  if (shows(settings?.other.serviceType)) layout.field("Service", receipt.serviceType);
  if (shows(settings?.other.tableOrRoom) && receipt.tableOrRoom) {
    const label = roomServices.has(String(receipt.serviceType).toUpperCase()) ? "Room" : "Table";
    layout.field(label, receipt.tableOrRoom);
  }
  if (shows(settings?.other.pickupCode)) layout.field("Pickup", receipt.pickupCode);
  if (receipt.startTime) layout.field(receipt.startTimeLabel || "Start", receipt.startTime);
  if (receipt.endTime) layout.field(receipt.endTimeLabel || "End", receipt.endTime);
  if (shows(settings?.other.cashier) && receipt.cashier) layout.field("Cashier", receipt.cashier);
  for (const fact of receipt.facts || []) layout.field(fact.label, fact.value);

  if (receipt.lines.length) {
    layout.rule("-");
    receipt.lines.forEach((item, index) => {
      if (index) layout.gap();
      const quantity = quantityText(item.quantity);
      const unit = Number(item.unitPrice);
      const hasPrice = showPrices && item.unitPrice?.trim() && Number.isFinite(unit);
      const amount = hasPrice ? printMoney(unit * (Number(item.quantity) || 0)) : "";
      layout.pair(qtyFirst ? `${quantity} x ${item.name}` : `${item.name} x${quantity}`, amount, {
        size: itemSize,
      });
      if (settings?.item.bilingual) layout.indented(4, item.altName);
      if (hasPrice && Number(item.quantity) !== 1) {
        layout.indented(4, `${quantity} @ ${printMoney(unit)}`);
      }
      if (showModifiers) {
        for (const modifier of modifierRows(item, showPrices)) layout.indented(4, modifier);
      }
      if (shows(settings?.item.productRemarks) && item.remarks?.trim()) {
        layout.indented(4, `* ${item.remarks.trim()}`);
      }
    });
  }

  if (settings?.item.categorySubtotal) {
    const totals = new Map<string, number>();
    for (const line of receipt.lines) {
      const name = line.categoryName || line.categoryId;
      const amount = Number(line.quantity) * Number(line.unitPrice);
      if (name && Number.isFinite(amount)) totals.set(name, (totals.get(name) || 0) + amount);
    }
    if (totals.size) {
      layout.rule("-");
      for (const [name, total] of totals) layout.pair(name, printMoney(total));
    }
  }

  const breakdown: Array<[string, string | undefined]> = showBreakdown
    ? [
        ["Subtotal", receipt.subtotal],
        ["Discount", receipt.discount],
        ["Tax", receipt.tax],
        ["Service charge", receipt.serviceCharge],
        ["Rounding", settings?.bill.rounding ? receipt.rounding : undefined],
      ]
    : [];
  const shownBreakdown = [
    ...breakdown,
    ...(receipt.amounts || []).map((row): [string, string] => [row.label, row.amount]),
  ].filter(([, value]) => value && Number(value) !== 0);
  if (shownBreakdown.length || showTotal) layout.rule("-");
  const amount = (value?: string | number | null) => printAmount(value, receipt.currency);
  for (const [label, value] of shownBreakdown) {
    const owed = label === "Discount" && Number(value) > 0 ? -Number(value) : value;
    layout.pair(label, amount(owed));
  }
  if (showTotal) {
    if (shownBreakdown.length) layout.rule("-");
    layout.pair(receipt.totalLabel || "TOTAL", amount(receipt.total), {
      size: "tall",
      bold: true,
    });
  }
  const payments = showPayments ? receipt.payments || [] : [];
  if (payments.length || receipt.change || receipt.balanceAfter) layout.rule("-");
  for (const payment of payments) layout.field(payment.name, amount(payment.amount));
  if (showPayments && receipt.change && Number(receipt.change) > 0) {
    layout.pair("Change", amount(receipt.change), { bold: true });
  }
  if (receipt.balanceAfter) {
    layout.pair("Card balance", amount(receipt.balanceAfter), { bold: true });
  }
  layout.rule("=");
  const footer =
    receipt.footer ?? (settings?.other.footerText || (finance || shift ? "" : "Thank you!"));
  layout.line(footer, { align: "center" });
  return layout;
}

export function formatKitchenSlip(slip: KitchenSlip): string {
  return toEscPos(kitchenLayout(slip));
}

export function buildKitchenSlipLines(slip: KitchenSlip): string[] {
  return toPlainLines(kitchenLayout(slip));
}

export function kitchenSlipPreview(slip: KitchenSlip): SlipPreview {
  return toPreview(kitchenLayout(slip));
}

export function saleReceiptPreview(receipt: SaleReceipt): SlipPreview {
  return toPreview(receiptLayout(receipt));
}

export function formatSaleReceipt(receipt: SaleReceipt): string {
  return toEscPos(receiptLayout(receipt));
}

export function buildSaleReceiptLines(receipt: SaleReceipt): string[] {
  return toPlainLines(receiptLayout(receipt));
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
    seat: line.seatNumber ? String(line.seatNumber) : undefined,
  }));
}

/** The table, room or pickup a ticket is for, as the kitchen slip shows it. */
export function kdsTicketPlace(ticket: KdsTicket): string | undefined {
  const place = ticket.place;
  if (place?.kind === "TABLE" && place.number) return `Table ${place.number}`;
  if (place?.kind === "SPA_ROOM" && place.number) return `SPA ${place.number}`;
  if (place?.kind === "KTV_ROOM" && place.number) return `KTV ${place.number}`;
  if (ticket.pickupNumber) return `Pickup ${ticket.pickupNumber}`;
  if (place?.kind === "COUNTER") return "Counter";
  return undefined;
}

const serviceText = (service?: string | null) => {
  if (!service) return undefined;
  const text = service.replaceAll("_", " ").toLowerCase();
  if (text === "dine in") return "Dine-in";
  if (text === "take away" || text === "takeaway") return "Takeaway";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Under the place: the room's name, how it is served and how many guests. */
export function kdsTicketPlaceDetail(ticket: KdsTicket): string | undefined {
  const place = ticket.place;
  const guests = place?.guestCount
    ? `${place.guestCount} ${place.guestCount === 1 ? "guest" : "guests"}`
    : undefined;
  const parts = [
    place?.name && place.name !== place.number ? place.name : undefined,
    place?.kind === "SPA_ROOM" || place?.kind === "KTV_ROOM"
      ? undefined
      : serviceText(ticket.serviceType),
    guests,
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : undefined;
}

/** Who sent a ticket: the staff member, or the room tablet it came from. */
export function kdsTicketSender(ticket: KdsTicket): string | undefined {
  if (ticket.sentFrom === "TABLET") return ticket.deviceName || "Room tablet";
  return cashierLabel(ticket.sentBy);
}

/** A ticket as the kitchen slip prints it. */
export function kdsTicketSlip(ticket: KdsTicket): KitchenSlip {
  return {
    title: ticket.ticketNumber || ticket.id,
    status: ticket.status,
    courseType: ticket.courseType,
    firedAt: ticket.firedAt,
    stationId: ticket.stationId || ticket.station?.id,
    stationName: ticket.station?.name,
    orderRef: ticket.orderNumber || undefined,
    place: kdsTicketPlace(ticket),
    placeDetail: kdsTicketPlaceDetail(ticket),
    sentBy: kdsTicketSender(ticket),
    lines: kdsTicketPrintLines(ticket),
  };
}

export function formatKdsTicket(ticket: KdsTicket): string {
  return formatKitchenSlip(kdsTicketSlip(ticket));
}

export function formatPrinterTest(name: string): string {
  const layout = new Layout(columnsFor());
  layout.line("PRINTER TEST", { align: "center", size: "wide", bold: true });
  layout.line(name, { align: "center" });
  layout.line("Connection verified", { align: "center" });
  layout.line(formatPrintDate(new Date()), { align: "center" });
  return toEscPos(layout);
}

export function buildPrinterTestLines(name: string): string[] {
  return ["PRINTER TEST", name, "Connection verified", formatPrintDate(new Date())];
}
