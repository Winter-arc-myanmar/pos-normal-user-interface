import { describe, expect, it } from "vitest";
import {
  allocateOrderDiscountToLines,
  isFocLine,
  lineFocDiscount,
  payableFromServerGrandTotal,
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

  it("does not add service charge again to a refreshed server grand total", () => {
    expect(
      payableFromServerGrandTotal({
        serverGrandTotal: 358_050,
      })
    ).toBe(358_050);
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

  it("gives an extra fee none of the order discount and sends its amount and name", () => {
    expect(
      allocateOrderDiscountToLines(
        [
          { variantId: "fee", quantity: "2.0000", unitPrice: "300.0000", productName: "Paper bag" },
          { variantId: "rice", quantity: "1.0000", unitPrice: "1000.0000" },
        ],
        100,
        (line) => line.variantId === "fee"
      )
    ).toEqual([
      {
        variantId: "fee",
        quantity: "2.0000",
        lineDiscount: "0.0000",
        unitPrice: "300.0000",
        name: "Paper bag",
      },
      { variantId: "rice", quantity: "1.0000", lineDiscount: "100.0000" },
    ]);
  });

  it("sends the picked options with an item for the server to price", () => {
    expect(
      allocateOrderDiscountToLines(
        [
          {
            variantId: "noodles",
            quantity: "1.0000",
            unitPrice: "4200.0000",
            selectedModifiers: [
              { modifierId: "egg", name: "Egg", priceDelta: "500.0000" },
              { modifierId: "cheese", name: "Cheese", priceDelta: "700.0000" },
            ],
          },
        ],
        0
      )[0].selectedModifiers
    ).toEqual([{ modifierId: "egg" }, { modifierId: "cheese" }]);
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
