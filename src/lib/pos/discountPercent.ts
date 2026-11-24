import { toMoney } from "./checkoutAdjustments";

/**
 * A bill discount the cashier typed as a percentage, turned into the money the
 * bill endpoints take: `GET /sales-orders/:id/bill` and settle both carry an
 * amount, not a rate. The till works the amount out here, so the server still
 * prices the bill and checks that the discount fits it.
 */
export function discountAmountForPercent(percent: string, base: number): string {
  const typed = Number(
    String(percent ?? "")
      .trim()
      .replace("%", "")
      .replace(",", ".")
  );
  // A discount of the whole bill is the most a percentage can ask for.
  const rate = Number.isFinite(typed) ? Math.min(Math.max(typed, 0), 100) : 0;
  const bill = Number.isFinite(base) ? Math.max(0, base) : 0;
  return toMoney((bill * rate) / 100);
}
