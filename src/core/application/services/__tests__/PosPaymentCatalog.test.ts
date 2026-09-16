import { describe, expect, it } from "vitest";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import { PosPaymentCatalog } from "../PosPaymentCatalog";

describe("PosPaymentCatalog", () => {
  it("requires guestCardId on member-card checkout payments", () => {
    const methods = [
      new PaymentMethod({ id: "cash", tenantId: "t1", name: "Cash" }),
      new PaymentMethod({
        id: "member",
        tenantId: "t1",
        name: "Member Card",
        code: "MEMBER_CARD",
      }),
    ];

    expect(() =>
      PosPaymentCatalog.assertGuestCardPayments(
        [{ paymentMethodId: "member", amount: "10.5000" }],
        methods
      )
    ).toThrow(/guest card/i);

    expect(() =>
      PosPaymentCatalog.assertGuestCardPayments(
        [
          { paymentMethodId: "cash", amount: "4.0000" },
          {
            paymentMethodId: "member",
            amount: "6.5000",
            guestCardId: "card-1",
          },
        ],
        methods
      )
    ).not.toThrow();
  });
});
