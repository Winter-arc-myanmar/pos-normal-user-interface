import { describe, expect, it } from "vitest";
import { billBreakdown } from "../billBreakdown";

const charges = { billDiscount: 0, serviceCharge: 0, tax: 0, includedTax: 0, tip: 0 };

describe("billBreakdown", () => {
  it("splits each kind of discount from the items at menu prices", () => {
    const lines = [
      { id: "water", quantity: "3", unitPrice: "2000.0000", lineDiscount: "0.0000" },
      { id: "water-cheap", quantity: "1", unitPrice: "1500.0000", lineDiscount: "0.0000" },
      { id: "beer", quantity: "2", unitPrice: "6000.0000", lineDiscount: "6000.0000", appliedPromotionId: "promo" },
      { id: "cake", quantity: "1", unitPrice: "4000.0000", lineDiscount: "4000.0000" },
      { id: "rice", quantity: "1", unitPrice: "5000.0000", lineDiscount: "500.0000" },
    ];
    const menu: Record<string, number> = { water: 2000, "water-cheap": 2000, beer: 6000, cake: 4000, rice: 5000 };
    const result = billBreakdown({
      ...charges,
      lines,
      menuPrice: (line) => menu[line.id],
      itemsTotal: 28500,
      billDiscount: 1000,
      serviceCharge: 800,
      tax: 840,
      tip: 200,
      total: 18840,
    });
    expect(result).toMatchObject({
      subtotal: 29000,
      priceChange: -500,
      promotion: 6000,
      foc: 4000,
      itemDiscount: 500,
      billDiscount: 1000,
    });
    const sum = result.subtotal + result.priceChange - result.promotion - result.foc
      - result.itemDiscount - result.billDiscount + result.serviceCharge + result.tax + result.tip;
    expect(sum).toBe(result.total);
  });

  it("adds a raised price and skips lines the menu does not price", () => {
    const result = billBreakdown({
      ...charges,
      lines: [
        { quantity: "2", unitPrice: "2500.0000" },
        { quantity: "1", unitPrice: "1000.0000" },
      ],
      menuPrice: (line) => (line.unitPrice === "2500.0000" ? 2000 : undefined),
      itemsTotal: 6000,
      total: 6000,
    });
    expect(result.priceChange).toBe(1000);
    expect(result.subtotal).toBe(5000);
  });
});
