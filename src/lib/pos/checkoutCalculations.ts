export interface CheckoutLineTotalsInput {
  quantity: string | number;
  unitPrice: string | number;
  lineDiscount?: string | number;
  isTaxable?: boolean;
  taxRate?: number;
  isPriceInclusive?: boolean;
}

export interface CheckoutLineTotals {
  netOrGross: number;
  taxAmount: number;
  lineTotal: number;
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function safeRate(value: unknown): number {
  const parsed = toNumber(value);
  if (parsed <= 0) return 0;
  return parsed > 1 ? parsed / 100 : parsed;
}

export function calcTax(
  amount: number,
  rate: number,
  isPriceInclusive: boolean
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const normalizedRate = safeRate(rate);
  if (normalizedRate <= 0) return 0;
  if (isPriceInclusive) return amount - amount / (1 + normalizedRate);
  return amount * normalizedRate;
}

export function calcLineTotals(
  args: CheckoutLineTotalsInput
): CheckoutLineTotals {
  const qty = toNumber(args.quantity);
  const unit = toNumber(args.unitPrice);
  const discount = toNumber(args.lineDiscount);
  const base = unit * qty - discount;
  const netOrGross = base > 0 ? base : 0;
  const taxable = Boolean(args.isTaxable);
  const rate = safeRate(args.taxRate);
  const inclusive = Boolean(args.isPriceInclusive);
  const taxAmount = taxable && rate > 0 ? calcTax(netOrGross, rate, inclusive) : 0;
  const lineTotal = inclusive ? netOrGross : netOrGross + taxAmount;
  return { netOrGross, taxAmount, lineTotal };
}
