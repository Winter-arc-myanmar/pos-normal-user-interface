import { describe, expect, it } from "vitest";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import {
  LOCAL_MEMBER_CARD_METHOD_ID,
  ensureMemberCardPaymentMethod,
  isMemberCardPaymentMethod,
} from "@/lib/pos/paymentMethods";

describe("paymentMethods", () => {
  it("detects member card methods from API names and kinds", () => {
    expect(
      isMemberCardPaymentMethod(
        new PaymentMethod({ id: "m1", name: "Membership Card", kind: "MEMBER_CARD" })
      )
    ).toBe(true);
    expect(
      isMemberCardPaymentMethod(
        new PaymentMethod({ id: "g1", name: "Guest Card", kind: "GUEST_CARD" })
      )
    ).toBe(true);
    expect(
      isMemberCardPaymentMethod(
        new PaymentMethod({ id: "cash", name: "Cash", kind: "CASH" })
      )
    ).toBe(false);
  });

  it("does not invent a demo member card method when the API list has none", () => {
    const methods = ensureMemberCardPaymentMethod([
      new PaymentMethod({ id: "cash", tenantId: "t1", name: "Cash" }),
    ]);
    expect(methods.some((method) => method.id === LOCAL_MEMBER_CARD_METHOD_ID)).toBe(
      false
    );
    expect(
      ensureMemberCardPaymentMethod([
        new PaymentMethod({ id: "mc", name: "Member Card" }),
      ]).filter((method) => isMemberCardPaymentMethod(method))
    ).toHaveLength(1);
  });
});
