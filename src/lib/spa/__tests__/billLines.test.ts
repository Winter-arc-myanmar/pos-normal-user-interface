import { describe, expect, it } from "vitest";
import { SalesOrderLine } from "@/core/domain/entities/Cashier";
import { groupBillLines } from "../billLines";

const line = (id: string, overrides: Partial<SalesOrderLine> = {}) =>
  new SalesOrderLine({
    id,
    salesOrderId: "order-1",
    variantId: "v-jager",
    quantity: "1.0000",
    unitPrice: "15000.0000",
    productName: "Jager Bomb",
    ...overrides,
  });

describe("groupBillLines", () => {
  it("shows the same drink ordered in two rounds as one row", () => {
    const [jager, tea] = groupBillLines([
      line("a"),
      line("b", { variantId: "v-tea", unitPrice: "10000.0000", productName: "Long Island Tea" }),
      line("c", { quantity: "2.0000" }),
      line("d", { variantId: "v-tea", unitPrice: "10000.0000", productName: "Long Island Tea" }),
    ]);

    expect(jager.lines.map((row) => row.id)).toEqual(["a", "c"]);
    expect(jager.quantity).toBe(3);
    expect(jager.total).toBe(45000);
    expect(tea.lines.map((row) => row.id)).toEqual(["b", "d"]);
    expect(tea.total).toBe(20000);
  });

  it("keeps free, promoted, other-hostess and other-price lines apart", () => {
    const groups = groupBillLines([
      line("a"),
      line("free", { compReasonId: "foc" }),
      line("promo", { appliedPromotionId: "happy-hour", lineDiscount: "5000.0000" }),
      line("hostess", { hostessId: "h-1" }),
      line("price", { unitPrice: "12000.0000" }),
      line("b"),
    ]);

    expect(groups.map((group) => group.lines.map((row) => row.id))).toEqual([
      ["a", "b"],
      ["free"],
      ["promo"],
      ["hostess"],
      ["price"],
    ]);
    expect(groups[2].total).toBe(10000);
  });
});
