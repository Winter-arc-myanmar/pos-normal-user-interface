import { describe, expect, it } from "vitest";
import { OrderPayment, PaymentMethod, SalesOrder, SalesOrderLine } from "@/core/domain/entities/Cashier";
import { canRelabel, editPayload, hasEditChanges, initialEditState } from "../orderEdit";

const order = new SalesOrder({
  id: "order-1",
  orderNumber: "SO-1",
  status: "COMPLETED",
  customerId: "cust-1",
  customerName: "Ma Hla",
  totalDiscount: "1500.0000",
  totalTax: "0.0000",
  serviceCharge: "500.0000",
  grandTotal: "15000.0000",
});

const line = (id: string, over: Partial<SalesOrderLine> = {}) =>
  new SalesOrderLine({
    id,
    salesOrderId: "order-1",
    variantId: `variant-${id}`,
    productName: id,
    quantity: "2.0000",
    unitPrice: "3000.0000",
    lineDiscount: "500.0000",
    status: "SERVED",
    ...over,
  });

describe("order edit", () => {
  it("starts from the lines still charged, with the discount on the bill as a whole", () => {
    const state = initialEditState(
      order,
      [line("beer"), line("sprite", { status: "VOIDED" })],
      "Item"
    );

    expect(state.lines.map((item) => item.id)).toEqual(["beer"]);
    expect(state.lines[0]).toMatchObject({ quantity: 2, unitPrice: "3000" });
    expect(state.billDiscount).toBe("1000");
    expect(state.includeTax).toBe(false);
    expect(state.includeServiceCharge).toBe(true);
    expect(state.customerId).toBe("cust-1");
  });

  it("sends kept lines by id, new ones by product, and leaves removed ones out", () => {
    const initial = initialEditState(order, [line("beer"), line("rice")], "Item");
    const state = {
      ...initial,
      lines: [
        { ...initial.lines[0], quantity: 3 },
        { ...initial.lines[1], removed: true },
        { key: "new", variantId: "variant-cola", name: "Cola", quantity: 1, unitPrice: "2000", removed: false },
      ],
      customerId: null,
      paymentMethods: { "pay-1": "method-kpay" },
    };

    expect(editPayload(state, initial)).toEqual({
      lines: [
        { id: "beer", quantity: "3.0000", unitPrice: "3000.0000" },
        { variantId: "variant-cola", quantity: "1.0000", unitPrice: "2000.0000" },
      ],
      billDiscount: "500.0000",
      includeTax: false,
      includeServiceCharge: true,
      customerId: null,
      paymentMethods: [{ paymentId: "pay-1", paymentMethodId: "method-kpay" }],
    });
    expect(hasEditChanges(state, initial)).toBe(true);
    expect(hasEditChanges(initial, initial)).toBe(false);
  });

  it("only relabels a payment taken with a method that moved no balance", () => {
    const cash = new PaymentMethod({ id: "cash", tenantId: "t", name: "Cash", kind: "CASH" });
    const card = new PaymentMethod({ id: "card", tenantId: "t", name: "Card", kind: "GUEST_CARD" });
    const paid = new OrderPayment({ id: "p", salesOrderId: "order-1", paymentMethodId: "cash", amount: "100" });

    expect(canRelabel(paid, cash)).toBe(true);
    expect(canRelabel(paid, card)).toBe(false);
    expect(canRelabel({ ...paid, walletLedgerEntryId: "spend" } as OrderPayment, cash)).toBe(false);
    expect(canRelabel({ ...paid, amount: "-100" } as OrderPayment, cash)).toBe(false);
  });
});
