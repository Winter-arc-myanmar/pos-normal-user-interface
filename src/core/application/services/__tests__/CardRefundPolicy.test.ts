import { describe, expect, it } from "vitest";
import { CardRefundPolicy } from "../CardRefundPolicy";

describe("CardRefundPolicy", () => {
  it("caps refunds at remaining card balance after spend", () => {
    expect(
      CardRefundPolicy.refundableAmount({
        balance: "10000.0000",
        purchasedBalance: "50000.0000",
      })
    ).toBe(10000);
  });

  it("does not refund more than purchased value when bonus remains", () => {
    expect(
      CardRefundPolicy.refundableAmount({
        balance: "15000.0000",
        purchasedBalance: "10000.0000",
      })
    ).toBe(10000);
  });

  it("rejects an amount over the remaining card balance", () => {
    expect(() =>
      CardRefundPolicy.assertRefundAmount("20000", {
        balance: "10000.0000",
        purchasedBalance: "50000.0000",
      })
    ).toThrow("Refund amount cannot exceed card balance");
  });

  it("allows a refund equal to remaining card balance", () => {
    expect(() =>
      CardRefundPolicy.assertRefundAmount("10000.0000", {
        balance: "10000.0000",
        purchasedBalance: "50000.0000",
      })
    ).not.toThrow();
  });
});
