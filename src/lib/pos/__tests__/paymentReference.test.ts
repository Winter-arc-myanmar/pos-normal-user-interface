import { describe, expect, it } from "vitest";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import {
  assertPaymentReference,
  paymentRequiresReference,
} from "../paymentReference";

describe("paymentRequiresReference", () => {
  it("requires a reference for mobile wallet methods", () => {
    expect(
      paymentRequiresReference(
        new PaymentMethod({ id: "pm-1", name: "KBZ Pay", code: "KBZ" })
      )
    ).toBe(true);
    expect(
      paymentRequiresReference(
        new PaymentMethod({ id: "pm-2", name: "Wave Money", kind: "WALLET" })
      )
    ).toBe(true);
  });

  it("does not require a reference for cash or member card", () => {
    expect(
      paymentRequiresReference(
        new PaymentMethod({ id: "cash", name: "Cash", kind: "CASH" })
      )
    ).toBe(false);
    expect(
      paymentRequiresReference(
        new PaymentMethod({ id: "mc", name: "Member Card", kind: "MEMBER_CARD" })
      )
    ).toBe(false);
  });

  it("throws when a required reference is missing", () => {
    expect(() =>
      assertPaymentReference(
        new PaymentMethod({ id: "pm-1", name: "KBZ Pay" }),
        " "
      )
    ).toThrow("A payment reference is required for this method");
  });
});
