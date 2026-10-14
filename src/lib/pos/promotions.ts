import type { SalesOrderLine } from "@/core/domain/entities/Cashier";
import type {
  PromotionDiscount,
  RunningPromotion,
} from "@/core/domain/entities/Promotion";
import { isFocLine } from "./checkoutAdjustments";

export interface PromotionPreviewItem {
  variantId: string;
  quantity: number;
  unitPrice?: number;
}

export interface LinePromotionSaving {
  amount: number;
  names: string[];
}

/**
 * The order lines the server has not priced a promotion for yet, as the preview
 * endpoint wants them. Lines already carrying a promotion are left out, as their
 * discount is on the bill already.
 */
export function promotionPreviewItems(
  lines: SalesOrderLine[]
): PromotionPreviewItem[] {
  return lines
    .filter(
      (line) =>
        !line.appliedPromotionId &&
        !isFocLine(line) &&
        Number(line.quantity) > 0
    )
    .map((line) => ({
      variantId: line.variantId,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice || 0),
    }));
}

/**
 * What a promotion takes off one line: what the server already credited it, or
 * what the running promotions would take off it. Null when nothing applies.
 */
export function linePromotionSaving(
  line: SalesOrderLine,
  discounts: Record<string, PromotionDiscount> = {}
): LinePromotionSaving | null {
  if (isFocLine(line)) return null;
  if (line.appliedPromotionId) {
    const amount = Number(line.lineDiscount || 0);
    return amount > 0 ? { amount, names: [] } : null;
  }
  const deal = discounts[line.variantId];
  if (!deal?.discount) return null;
  return { amount: deal.discount, names: deal.names.filter(Boolean) };
}

/** The promotion savings the server already took, so they are inside the total. */
export function appliedPromotionDiscount(lines: SalesOrderLine[]): number {
  return lines.reduce(
    (sum, line) =>
      line.appliedPromotionId && !isFocLine(line)
        ? sum + Math.max(0, Number(line.lineDiscount || 0))
        : sum,
    0
  );
}

/** How the till writes a running promotion: its name, then what it gives. */
export function promotionSummary(
  promotion: RunningPromotion,
  text: {
    freeTime: (buy: number, free: number) => string;
    money: (value: number) => string;
  }
): string {
  if (promotion.discountType === "FREE_TIME") {
    return `${promotion.name} (${text.freeTime(
      promotion.buyUnits ?? 1,
      promotion.freeUnits ?? 1
    )})`;
  }
  if (promotion.discountType === "PERCENT_OFF") {
    return `${promotion.name} (${promotion.discountValue}%)`;
  }
  return `${promotion.name} (−${text.money(promotion.discountValue)})`;
}
