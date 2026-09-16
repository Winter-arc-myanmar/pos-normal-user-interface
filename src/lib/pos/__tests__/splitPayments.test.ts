import { describe, expect, it } from "vitest";
import {
  assertCheckoutPaymentsReady,
  buildCheckoutPayments,
  remainingReceivable,
} from "@/lib/pos/splitPayments";

describe("splitPayments", () => {
  it("builds a single tender when split mode is off", () => {
    expect(
      buildCheckoutPayments({
        total: "10.5000",
        paymentMethodId: "cash",
        paymentAmount: "10.5000",
      })
    ).toEqual([{ paymentMethodId: "cash", amount: "10.5000" }]);
  });

  it("builds multiple tenders in split mode and tracks remaining", () => {
    const tenders = [
      { id: "1", paymentMethodId: "cash", amount: "4.0000" },
      { id: "2", paymentMethodId: "member", amount: "6.5000" },
    ];
    expect(
      buildCheckoutPayments({
        total: "10.5000",
        isSplitMode: true,
        splitTenders: tenders,
      })
    ).toEqual([
      { paymentMethodId: "cash", amount: "4.0000" },
      { paymentMethodId: "member", amount: "6.5000" },
    ]);
    expect(remainingReceivable("10.5000", tenders)).toBe(0);

    expect(() =>
      assertCheckoutPaymentsReady({
        total: "10.5000",
        payments: [{ paymentMethodId: "cash", amount: "4.0000" }],
      })
    ).toThrow(/equal the remaining receivable/i);
  });

  it("attaches guestCardId only to member-card tenders", () => {
    expect(
      buildCheckoutPayments({
        total: "10.5000",
        paymentMethodId: "member",
        paymentAmount: "10.5000",
        guestCardId: "card-1",
      })
    ).toEqual([
      {
        paymentMethodId: "member",
        amount: "10.5000",
        guestCardId: "card-1",
      },
    ]);

    expect(
      buildCheckoutPayments({
        total: "10.5000",
        isSplitMode: true,
        splitTenders: [
          { id: "1", paymentMethodId: "cash", amount: "4.0000" },
          {
            id: "2",
            paymentMethodId: "member",
            amount: "6.5000",
            guestCardId: "card-1",
          },
        ],
      })
    ).toEqual([
      { paymentMethodId: "cash", amount: "4.0000" },
      {
        paymentMethodId: "member",
        amount: "6.5000",
        guestCardId: "card-1",
      },
    ]);
  });
});
