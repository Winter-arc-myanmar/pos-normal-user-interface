import { CheckoutPaymentEntryDTO } from "@/core/application/dtos/CashierDTO";

const toAmount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toMoney = (value: unknown): string =>
  Math.max(0, toAmount(value)).toFixed(4);

export function payableTotal(args: {
  lineTotal: number;
  orderDiscount?: number;
  serviceCharge?: number;
  tipAmount?: number;
}): number {
  return Math.max(
    0,
    toAmount(args.lineTotal) -
      Math.max(0, toAmount(args.orderDiscount)) +
      Math.max(0, toAmount(args.serviceCharge)) +
      Math.max(0, toAmount(args.tipAmount))
  );
}

export function lineGrossAmount(line: {
  quantity?: string | number;
  unitPrice?: string | number;
}): number {
  return Math.max(0, toAmount(line.quantity) * toAmount(line.unitPrice));
}

export function lineFocDiscount(line: {
  quantity?: string | number;
  unitPrice?: string | number;
}): string {
  return toMoney(lineGrossAmount(line));
}

export function isFocLine(line: {
  quantity?: string | number;
  unitPrice?: string | number;
  lineDiscount?: string | number;
}): boolean {
  const gross = lineGrossAmount(line);
  return gross > 0 && toAmount(line.lineDiscount) >= gross - 0.009;
}

export function allocateOrderDiscountToLines<
  T extends {
    variantId: string;
    quantity: string | number;
    unitPrice?: string | number;
    lineDiscount?: string | number;
  },
>(
  lines: T[],
  orderDiscount: number
): Array<{ variantId: string; quantity: string; lineDiscount: string }> {
  let remaining = Math.max(0, toAmount(orderDiscount));
  return lines.map((line) => {
    const existing = Math.max(0, toAmount(line.lineDiscount));
    const available = Math.max(0, lineGrossAmount(line) - existing);
    const extra = Math.min(remaining, available);
    remaining -= extra;
    return {
      variantId: line.variantId,
      quantity: toMoney(Math.max(0.0001, toAmount(line.quantity) || 1)),
      lineDiscount: toMoney(existing + extra),
    };
  });
}

export function withOrderTipOnFirstPayment(
  payments: CheckoutPaymentEntryDTO[],
  tipAmount?: string | number
): CheckoutPaymentEntryDTO[] {
  const tip = toAmount(tipAmount);
  if (tip <= 0) return payments;
  return payments.map((payment, index) =>
    index === 0 ? { ...payment, tipAmount: toMoney(tip) } : payment
  );
}
