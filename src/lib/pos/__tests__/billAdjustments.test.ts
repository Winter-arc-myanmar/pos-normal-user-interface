import { beforeEach, describe, expect, it } from "vitest";
import {
  EMPTY_BILL_ADJUSTMENTS,
  clearBillAdjustments,
  readBillAdjustments,
  writeBillAdjustments,
} from "../billAdjustments";

describe("billAdjustments", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("keeps each order's discount, reason and tip on that order alone", () => {
    writeBillAdjustments("order-1", {
      discount: "2000",
      discountReasonId: "reason-1",
      tip: "50",
    });
    writeBillAdjustments("order-2", {
      ...EMPTY_BILL_ADJUSTMENTS,
      discount: "10",
    });

    expect(readBillAdjustments("order-1")).toEqual({
      discount: "2000",
      discountReasonId: "reason-1",
      tip: "50",
    });
    expect(readBillAdjustments("order-2")).toEqual({
      discount: "10",
      discountReasonId: "",
      tip: "0.0000",
    });
  });

  it("has nothing to show for an order that never took an adjustment", () => {
    expect(readBillAdjustments("order-unknown")).toEqual(EMPTY_BILL_ADJUSTMENTS);
    expect(readBillAdjustments(undefined)).toEqual(EMPTY_BILL_ADJUSTMENTS);
  });

  it("forgets an adjustment that was set back to nothing", () => {
    writeBillAdjustments("order-1", {
      discount: "2000",
      discountReasonId: "",
      tip: "0.0000",
    });
    writeBillAdjustments("order-1", EMPTY_BILL_ADJUSTMENTS);

    expect(readBillAdjustments("order-1")).toEqual(EMPTY_BILL_ADJUSTMENTS);
  });

  it("clears one order without touching another", () => {
    writeBillAdjustments("order-1", { ...EMPTY_BILL_ADJUSTMENTS, discount: "5" });
    writeBillAdjustments("order-2", { ...EMPTY_BILL_ADJUSTMENTS, tip: "1" });

    clearBillAdjustments("order-1");

    expect(readBillAdjustments("order-1")).toEqual(EMPTY_BILL_ADJUSTMENTS);
    expect(readBillAdjustments("order-2").tip).toBe("1");
  });

  it("stores nothing for a quick sale that has no order yet", () => {
    writeBillAdjustments(undefined, { ...EMPTY_BILL_ADJUSTMENTS, discount: "5" });

    expect(sessionStorage.getItem("pos-bill-adjustments")).toBeNull();
  });
});
