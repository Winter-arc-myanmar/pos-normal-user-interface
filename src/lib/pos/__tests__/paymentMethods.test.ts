import { describe, expect, it } from "vitest";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import {
  LOCAL_MEMBER_CARD_METHOD_ID,
  ensureMemberCardPaymentMethod,
  isMemberCardPaymentMethod,
} from "@/lib/pos/paymentMethods";

describe("paymentMethods", () => {
  it("detects member card methods from API names and codes", () => {
    expect(
      isMemberCardPaymentMethod(
        new PaymentMethod({ id: "m1", name: "Membership Card", code: "MEMBER_CARD" })
      )
    ).toBe(true);
    expect(
      isMemberCardPaymentMethod(new PaymentMethod({ id: "cash", name: "Cash" }))
    ).toBe(false);
  });

  it("adds a local member card fallback when the API does not provide one", () => {
    const methods = ensureMemberCardPaymentMethod([
      new PaymentMethod({ id: "cash", tenantId: "t1", name: "Cash" }),
    ]);
    expect(methods.some((method) => method.id === LOCAL_MEMBER_CARD_METHOD_ID)).toBe(
      true
    );
    expect(
      ensureMemberCardPaymentMethod([
        new PaymentMethod({ id: "mc", name: "Member Card" }),
      ]).filter((method) => isMemberCardPaymentMethod(method))
    ).toHaveLength(1);
  });
});
