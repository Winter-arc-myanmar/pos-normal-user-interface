import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_BILL_ADJUSTMENTS,
  clearBillAdjustments,
  readBillAdjustments,
  writeBillAdjustments,
} from "../billAdjustments";

describe("billAdjustments", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(window.localStorage.getItem("pos-bill-adjustments")).toBeNull();
    expect(window.sessionStorage.getItem("pos-bill-adjustments")).toBeNull();
  });

  // The Android shell recreates its WebView, which clears sessionStorage but
  // keeps localStorage, so a typed bill must live in localStorage.
  it("survives a closed till, not only the current view", () => {
    writeBillAdjustments("order-1", { ...EMPTY_BILL_ADJUSTMENTS, discount: "5" });
    window.sessionStorage.clear();

    expect(JSON.parse(window.localStorage.getItem("pos-bill-adjustments") || "{}"))
      .toHaveProperty("order-1");
    expect(readBillAdjustments("order-1").discount).toBe("5");
  });

  it("drops a bill typed longer ago than a shift", () => {
    window.localStorage.setItem(
      "pos-bill-adjustments",
      JSON.stringify({
        "order-old": {
          discount: "5",
          discountReasonId: "",
          tip: "0.0000",
          savedAt: Date.now() - 13 * 60 * 60 * 1000,
        },
      })
    );

    expect(readBillAdjustments("order-old")).toEqual(EMPTY_BILL_ADJUSTMENTS);
  });

  // A WebView can deny storage by throwing instead of hiding the API.
  it("keeps the bill for the session when the WebView denies storage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });

    writeBillAdjustments("order-1", { ...EMPTY_BILL_ADJUSTMENTS, discount: "5" });

    expect(readBillAdjustments("order-1").discount).toBe("5");
  });
});
