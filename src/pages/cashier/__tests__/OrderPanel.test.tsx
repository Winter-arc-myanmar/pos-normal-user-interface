import { createRef, type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiningTable, PaymentMethod, SalesOrder, SalesOrderLine } from "@/core/domain/entities/Cashier";
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

const defaultProps: ComponentProps<typeof OrderPanel> = {
  selectedOrder: paidOrder,
  selectedOrderLines: [line],
  products: [],
  variantsByProductId: {},
  paymentMethods: [new PaymentMethod({ id: "cash", name: "Cash" })],
  paymentMethodId: "cash",
  paymentAmount: "10.0000",
  total: "10.0000",
  selectedTable: null,
  selectedSession: null,
  paymentInputRef: createRef<HTMLInputElement>(),
  isLoading: false,
  onCreateOrder: vi.fn(),
  onIncreaseLineQuantity: vi.fn(),
  onDecreaseLineQuantity: vi.fn(),
  onRemoveLine: vi.fn(),
  onPaymentAmountChange: vi.fn(),
  onPaymentMethodChange: vi.fn(),
  onOpenPay: vi.fn(),
  onCheckout: vi.fn(),
  onFireKds: vi.fn(),
  onPickup: vi.fn(),
  onTableStatusChange: vi.fn(),
  onSessionStateChange: vi.fn(),
};

describe("OrderPanel", () => {
  it("does not allow paying a completed takeaway order again", () => {
    const onOpenPay = vi.fn();
    const onCheckout = vi.fn();

    render(
      <OrderPanel
        {...defaultProps}
        onOpenPay={onOpenPay}
        onCheckout={onCheckout}
      />
    );

    expect(screen.getByRole("button", { name: "cashier.payNow" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payNow" }));
    expect(onOpenPay).not.toHaveBeenCalled();
    expect(onCheckout).not.toHaveBeenCalled();
  });

  it("confirms cancel order before voiding and releasing a table", () => {
    const onCancelOrder = vi.fn();

    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedTable={
          new DiningTable({
            id: "table-1",
            tableNumber: "T-02",
            status: "OCCUPIED",
          })
        }
        onCancelOrder={onCancelOrder}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.cancelOrder" })
    );
    expect(onCancelOrder).not.toHaveBeenCalled();
    expect(
      screen.getByText("cashier.orderPanel.cancelOrderConfirmTable")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.confirmCancelOrder" })
    );
    expect(onCancelOrder).toHaveBeenCalledTimes(1);
  });
});
