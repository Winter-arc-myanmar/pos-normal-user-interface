import { describe, expect, it } from "vitest";
import { SalesOrderLine } from "@/core/domain/entities/Cashier";
import type { RunningPromotion } from "@/core/domain/entities/Promotion";
import {
  appliedPromotionDiscount,
  linePromotionSaving,
  promotionPreviewItems,
  promotionSummary,
} from "@/lib/pos/promotions";

const line = (overrides: Partial<SalesOrderLine> = {}): SalesOrderLine =>
  new SalesOrderLine({
    id: "line-1",
    salesOrderId: "order-1",
    variantId: "variant-shot",
    quantity: "1.0000",
    unitPrice: "10.0000",
    ...overrides,
  });

const deal = (overrides: Partial<RunningPromotion> = {}): RunningPromotion => ({
  id: "promo-1",
  name: "Special Menu",
  discountType: "PERCENT_OFF",
  discountValue: 10,
  buyUnits: null,
  freeUnits: null,
  appliesTo: "ALL_ITEMS",
  productGroups: [],
  variantIds: [],
  priorityLevel: 0,
  ...overrides,
});

describe("cashier promotion preview", () => {
  it("only asks the server about the lines it has not priced yet", () => {
    const lines = [
      line({ id: "pending" }),
      line({ id: "promoted", appliedPromotionId: "promo-1", lineDiscount: "1.0000" }),
      line({ id: "free", lineDiscount: "10.0000" }),
      line({ id: "empty", quantity: "0.0000" }),
    ];

    expect(promotionPreviewItems(lines)).toEqual([
      { variantId: "variant-shot", quantity: 1, unitPrice: 10 },
    ]);
  });
});

describe("line promotion saving", () => {
  it("reads the discount the server already credited from the line discount", () => {
    expect(
      linePromotionSaving(line({ appliedPromotionId: "promo-1", lineDiscount: "1.0000" }))
    ).toEqual({ amount: 1, names: [] });
  });

  it("reads a saving the running rules would take off a line not priced yet", () => {
    expect(
      linePromotionSaving(line(), {
        "variant-shot": { discount: 1.5, names: ["Special Menu"] },
      })
    ).toEqual({ amount: 1.5, names: ["Special Menu"] });
  });

  it("shows nothing for a free item or a line no promotion touches", () => {
    expect(linePromotionSaving(line({ lineDiscount: "10.0000" }))).toBeNull();
    expect(linePromotionSaving(line(), {})).toBeNull();
    expect(
      linePromotionSaving(line(), { "variant-shot": { discount: 0, names: [] } })
    ).toBeNull();
  });
});

describe("promotion discount already on the bill", () => {
  it("adds up only the promotions the server applied, as free lines carry none", () => {
    const lines = [
      line({ appliedPromotionId: "promo-1", lineDiscount: "1.0000" }),
      line({ id: "line-2", appliedPromotionId: "promo-2", lineDiscount: "2.0000" }),
      line({ id: "line-3", lineDiscount: "0.5000" }),
      line({ id: "line-4", appliedPromotionId: "promo-3", lineDiscount: "10.0000" }),
    ];

    expect(appliedPromotionDiscount(lines)).toBe(3);
  });
});

describe("running promotion summary", () => {
  const text = {
    freeTime: (buy: number, free: number) => `buy ${buy}, get ${free} free`,
    money: (value: number) => value.toLocaleString(),
  };

  it("writes what each kind of rule gives", () => {
    expect(promotionSummary(deal(), text)).toBe("Special Menu (10%)");
    expect(
      promotionSummary(deal({ discountType: "AMOUNT_OFF", discountValue: 1000 }), text)
    ).toBe("Special Menu (−1,000)");
    expect(
      promotionSummary(
        deal({ discountType: "FREE_TIME", buyUnits: 1, freeUnits: 1 }),
        text
      )
    ).toBe("Special Menu (buy 1, get 1 free)");
  });
});
