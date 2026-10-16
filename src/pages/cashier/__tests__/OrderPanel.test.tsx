import { createRef, type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiningTable, PaymentMethod, SalesOrder, SalesOrderLine } from "@/core/domain/entities/Cashier";
import type { RunningPromotion } from "@/core/domain/entities/Promotion";
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

const promotion: RunningPromotion = {
  id: "promo-1",
  name: "Special Menu",
  discountType: "PERCENT_OFF",
  discountValue: 10,
  buyUnits: null,
  freeUnits: null,
  appliesTo: "ALL_ITEMS",
  productGroups: [],
  variantIds: [],
  priorityLevel: 0,
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

  it("keeps Pay disabled until a table is assigned", () => {
    const onOpenPay = vi.fn();
    const onCheckout = vi.fn();

    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedTable={null}
        requiresTableAssignment
        onOpenPay={onOpenPay}
        onCheckout={onCheckout}
      />
    );

    const payButton = screen.getByRole("button", { name: "cashier.payNow" });
    expect(payButton).toBeDisabled();
    fireEvent.click(payButton);
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

  it("lets cashiers edit checkout adjustments and mark a line FOC", () => {
    const onDiscountAmountChange = vi.fn();
    const onRemoveDiscount = vi.fn();
    const onToggleFoc = vi.fn();

    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        discountAmount="5.0000"
        discountReasons={[]}
        serviceCharge="0.0000"
        tipAmount="0.0000"
        onDiscountAmountChange={onDiscountAmountChange}
        onDiscountReasonChange={vi.fn()}
        onRemoveDiscount={onRemoveDiscount}
        onServiceChargeChange={vi.fn()}
        onTipAmountChange={vi.fn()}
        onMemberCardUidChange={vi.fn()}
        onLookupMemberCard={vi.fn()}
        onToggleFoc={onToggleFoc}
      />
    );

    expect(
      screen.getByRole("button", { name: "cashier.orderPanel.adjustments" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("cashier.orderPanel.adjustments")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("cashier.orderPanel.discount"), {
      target: { value: "8.0000" },
    });
    expect(onDiscountAmountChange).toHaveBeenCalledWith("8.0000");
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.removeDiscount" })
    );
    expect(onRemoveDiscount).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.foc" }));
    expect(onToggleFoc).toHaveBeenCalledTimes(1);
  });

  it("collapses checkout adjustments until the cashier opens them", () => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        discountAmount="0.0000"
        discountReasons={[]}
        serviceCharge="0.0000"
        tipAmount="0.0000"
        memberCardUid=""
        onDiscountAmountChange={vi.fn()}
        onDiscountReasonChange={vi.fn()}
        onRemoveDiscount={vi.fn()}
        onServiceChargeChange={vi.fn()}
        onTipAmountChange={vi.fn()}
        onMemberCardUidChange={vi.fn()}
        onLookupMemberCard={vi.fn()}
      />
    );

    const toggle = screen.getByRole("button", {
      name: "cashier.orderPanel.adjustments",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("cashier.orderPanel.discount")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("cashier.orderPanel.discount")).toBeInTheDocument();
  });

  it("shows the promotions running and the discount the server already took", () => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedOrderLines={[
          new SalesOrderLine({
            ...line,
            appliedPromotionId: "promo-1",
            lineDiscount: "1.0000",
          }),
        ]}
        promotions={[promotion]}
        promotionName={(id) => (id === "promo-1" ? "Special Menu" : undefined)}
      />
    );

    expect(screen.getByText("cashier.orderPanel.promotionsNow")).toBeInTheDocument();
    expect(screen.getByText("Special Menu (10%)")).toBeInTheDocument();
    expect(screen.getByText("cashier.orderPanel.promo")).toBeInTheDocument();
    expect(screen.getByText("cashier.orderPanel.promoSaving")).toBeInTheDocument();
    expect(screen.getByText("cashier.orderPanel.promotionDiscount")).toBeInTheDocument();
    expect(screen.getByText("−1")).toBeInTheDocument();
    // The promotion is inside the line: 10.00 charged, 1.00 off.
    expect(screen.getByText("9.00")).toBeInTheDocument();
  });

  it("previews the saving on a line the server has not priced yet", () => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedOrderLines={[line]}
        promotions={[promotion]}
        promotionDiscounts={{ "variant-1": { discount: 1, names: ["Special Menu"] } }}
      />
    );

    expect(screen.getByText("cashier.orderPanel.promo")).toBeInTheDocument();
    expect(screen.getByText("cashier.orderPanel.promoSaving")).toBeInTheDocument();
    // 10.00 on the line, 1.00 of promotion still to come off.
    expect(screen.getByText("9.00")).toBeInTheDocument();
    // Nothing is on the bill yet, so the total carries no discount row.
    expect(
      screen.queryByText("cashier.orderPanel.promotionDiscount")
    ).not.toBeInTheDocument();
  });

  it("names a line from the order itself, not from the menu it has loaded", () => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedOrderLines={[
          new SalesOrderLine({
            ...line,
            variantId: "variant-not-loaded",
            productName: "Fish Ball Stick",
          }),
        ]}
      />
    );

    expect(screen.getByText("Fish Ball Stick")).toBeInTheDocument();
  });

  it("shows the line's variant under the product name", () => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedOrderLines={[
          new SalesOrderLine({
            ...line,
            productName: "Coffee",
            variantName: "Large",
          }),
        ]}
      />
    );

    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("names the variant from the menu when the line carries only an id", () => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        products={[]}
        variantsByProductId={{
          "product-1": [
            {
              id: "variant-1",
              productId: "product-1",
              variantSku: "COFFEE-LARGE",
              matrixOptions: { size: "Large" },
            } as never,
          ],
        }}
      />
    );

    expect(screen.getByText("Large")).toBeInTheDocument();
  });
});
