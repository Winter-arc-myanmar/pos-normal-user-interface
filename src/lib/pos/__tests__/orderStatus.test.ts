import { describe, expect, it } from "vitest";
import { isSettledSalesOrder } from "../orderStatus";

describe("isSettledSalesOrder", () => {
  it("treats completed and cancelled orders as settled", () => {
    expect(isSettledSalesOrder({ status: "COMPLETED" })).toBe(true);
    expect(isSettledSalesOrder({ status: "CANCELLED" })).toBe(true);
    expect(isSettledSalesOrder({ status: "DRAFT" })).toBe(false);
    expect(isSettledSalesOrder({ status: "CONFIRMED" })).toBe(false);
    expect(isSettledSalesOrder(null)).toBe(false);
  });
});
