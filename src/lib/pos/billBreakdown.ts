import { isFocLine } from "./checkoutAdjustments";

export interface BillBreakdown {
  /** The items at menu prices. */
  subtotal: number;
  /** What changed prices add, below zero when they take off. */
  priceChange: number;
  promotion: number;
  foc: number;
  itemDiscount: number;
  billDiscount: number;
  serviceCharge: number;
  /** The tax added on top of the prices. */
  tax: number;
  /** The tax already inside the prices. */
  includedTax: number;
  tip: number;
  total: number;
}

interface BreakdownLine {
  quantity?: string | number;
  unitPrice?: string;
  lineDiscount?: string;
  appliedPromotionId?: string | null;
}

/**
 * How a bill comes to its total: the items at menu prices, then what each kind of
 * discount takes off and what service charge and tax add.
 */
export function billBreakdown<Line extends BreakdownLine>({
  lines,
  menuPrice,
  itemsTotal,
  billDiscount,
  serviceCharge,
  tax,
  includedTax,
  tip,
  total,
}: {
  lines: Line[];
  menuPrice: (line: Line) => number | undefined;
  /** The items at the prices on the bill, as the server counts them. */
  itemsTotal: number;
  billDiscount: number;
  serviceCharge: number;
  tax: number;
  includedTax: number;
  tip: number;
  total: number;
}): BillBreakdown {
  let priceChange = 0;
  let promotion = 0;
  let foc = 0;
  let itemDiscount = 0;
  for (const line of lines) {
    const quantity = Number(line.quantity || 0);
    const menu = menuPrice(line);
    if (menu !== undefined) priceChange += quantity * (Number(line.unitPrice || 0) - menu);
    const discount = Math.max(0, Number(line.lineDiscount || 0));
    if (isFocLine(line)) foc += discount;
    else if (line.appliedPromotionId) promotion += discount;
    else itemDiscount += discount;
  }
  if (Math.abs(priceChange) < 0.005) priceChange = 0;
  return {
    subtotal: itemsTotal - priceChange,
    priceChange,
    promotion,
    foc,
    itemDiscount,
    billDiscount: Math.max(0, billDiscount),
    serviceCharge,
    tax,
    includedTax,
    tip: Math.max(0, tip),
    total,
  };
}
