import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentMethod, SalesOrder, SalesOrderLine } from "@/core/domain/entities/Cashier";
import { OrderPanel } from "../OrderPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const paidOrder = new SalesOrder({
  id: "order-1",
  tenantId: "t1",
  locationId: "loc-1",
  orderNumber: "SO-180",
  salesChannel: "POS",
  serviceType: "TAKE_AWAY",
  status: "COMPLETED",
  subtotal: "10.0000",
  totalDiscount: "0.0000",
  totalTax: "0.0000",
  grandTotal: "10.0000",
  createdAt: "",
  updatedAt: "",
});

const line = new SalesOrderLine({
  id: "line-1",
  salesOrderId: "order-1",
  variantId: "variant-1",
  quantity: "1.0000",
  unitPrice: "10.0000",
});

describe("OrderPanel", () => {
  it("does not allow paying a completed takeaway order again", () => {
    const onOpenPay = vi.fn();
    const onCheckout = vi.fn();

    render(
      <OrderPanel
        selectedOrder={paidOrder}
        selectedOrderLines={[line]}
        products={[]}
        variantsByProductId={{}}
        paymentMethods={[new PaymentMethod({ id: "cash", name: "Cash" })]}
        paymentMethodId="cash"
        paymentAmount="10.0000"
        total="10.0000"
        selectedTable={null}
        selectedSession={null}
        paymentInputRef={createRef<HTMLInputElement>()}
        isLoading={false}
        onCreateOrder={vi.fn()}
        onIncreaseLineQuantity={vi.fn()}
        onDecreaseLineQuantity={vi.fn()}
        onRemoveLine={vi.fn()}
        onPaymentAmountChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onOpenPay={onOpenPay}
        onCheckout={onCheckout}
        onFireKds={vi.fn()}
        onPickup={vi.fn()}
        onTableStatusChange={vi.fn()}
        onSessionStateChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "cashier.payNow" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payNow" }));
    expect(onOpenPay).not.toHaveBeenCalled();
    expect(onCheckout).not.toHaveBeenCalled();
  });
});
