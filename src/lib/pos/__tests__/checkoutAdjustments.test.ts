import { describe, expect, it } from "vitest";
import {
  allocateOrderDiscountToLines,
  isFocLine,
  lineFocDiscount,
  payableTotal,
  withOrderTipOnFirstPayment,
} from "../checkoutAdjustments";

describe("checkoutAdjustments", () => {
  it("adds tip and extra fee after subtracting order discount", () => {
    expect(
      payableTotal({
        lineTotal: 100,
        orderDiscount: 10,
        serviceCharge: 3,
        tipAmount: 5,
      })
    ).toBe(98);
  });

  it("allocates order discount onto remaining line value", () => {
    expect(
      allocateOrderDiscountToLines(
        [
          {
            variantId: "a",
            quantity: "1.0000",
            unitPrice: "40.0000",
            lineDiscount: "0.0000",
          },
          {
            variantId: "b",
            quantity: "1.0000",
            unitPrice: "60.0000",
            lineDiscount: "60.0000",
          },
        ],
        15
      )
    ).toEqual([
      {
        variantId: "a",
        quantity: "1.0000",
        lineDiscount: "15.0000",
      },
      {
        variantId: "b",
        quantity: "1.0000",
        lineDiscount: "60.0000",
      },
    ]);
  });

  it("marks a fully discounted line as FOC", () => {
    expect(
      isFocLine({
        quantity: "2.0000",
        unitPrice: "10.0000",
        lineDiscount: "20.0000",
      })
    ).toBe(true);
    expect(lineFocDiscount({ quantity: "2.0000", unitPrice: "10.0000" })).toBe(
      "20.0000"
    );
  });

  it("attaches tipAmount to the first checkout payment only", () => {
    expect(
      withOrderTipOnFirstPayment(
        [
          { paymentMethodId: "cash", amount: "50.0000" },
          { paymentMethodId: "card", amount: "48.0000" },
        ],
        "5.0000"
      )
    ).toEqual([
      { paymentMethodId: "cash", amount: "50.0000", tipAmount: "5.0000" },
      { paymentMethodId: "card", amount: "48.0000" },
    ]);
  });
});
