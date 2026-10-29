import { createRef, type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiningTable, PaymentMethod, SalesOrder, SalesOrderLine, TableSession } from "@/core/domain/entities/Cashier";
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
  it("keeps table controls compact until the cashier expands them", () => {
    const onChangeTable = vi.fn();
    const onCombineTables = vi.fn();
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedTable={
          new DiningTable({
            id: "table-1",
            tableNumber: "T-05",
            status: "OCCUPIED",
          })
        }
        selectedSession={
          new TableSession({
            id: "session-1",
            tableId: "table-1",
            salesOrderId: "order-1",
            sessionState: "ORDERING",
          })
        }
        onChangeTable={onChangeTable}
        onCombineTables={onCombineTables}
      />
    );

    const toggle = screen.getByRole("button", {
      name: "cashier.orderPanel.expandTableControls",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("T-05");
    expect(toggle).not.toHaveTextContent("cashier.orderPanel.tableStatuses.OCCUPIED");
    expect(toggle).toHaveTextContent("cashier.orderPanel.sessionStates.ORDERING");
    expect(screen.queryByLabelText("cashier.orderPanel.tableStatus")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "cashier.seating.changeTable" })).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "cashier.orderPanel.collapseTableControls" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("cashier.orderPanel.tableStatus")).toBeInTheDocument();
    expect(screen.getByLabelText("cashier.orderPanel.sessionState")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cashier.seating.changeTable" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cashier.seating.combine" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cashier.seating.split" })).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.collapseTableControls" })
    );
    expect(
      screen.getByRole("button", { name: "cashier.orderPanel.expandTableControls" })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it.each([
    [true, false, "11.00"],
    [true, true, "10.00"],
    [false, false, "10.00"],
    [false, true, "9.00"],
  ])("displays row amounts for includeTax=%s inclusive=%s", (includeTax, taxInclusive, expected) => {
    render(<OrderPanel {...defaultProps} includeTax={includeTax}
      selectedOrderLines={[new SalesOrderLine({ ...line, taxAmount: "1.0000", taxInclusive })]} />);
    expect(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" })).toHaveTextContent(expected);
  });

  it("uses bill-priced lines for display without changing action payloads", () => {
    const onRemoveLine = vi.fn();
    render(<OrderPanel {...defaultProps}
      selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
      billLines={[new SalesOrderLine({ ...line, lineDiscount: "2.0000" })]}
      onRemoveLine={onRemoveLine} />);
    expect(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" })).toHaveTextContent("8.00");
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.remove" }));
    expect(onRemoveLine).toHaveBeenCalledWith(line);
  });

  it("shows one combined row while keeping post-KDS additions pending", () => {
    const onRemoveLine = vi.fn();
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedOrderLines={[
          new SalesOrderLine({
            ...line,
            productName: "Cola",
            quantity: "2.0000",
            status: "FIRED",
          }),
          new SalesOrderLine({
            ...line,
            id: "line-2",
            productName: "Cola",
            quantity: "1.0000",
            status: "PENDING",
          }),
        ]}
        onRemoveLine={onRemoveLine}
      />
    );

    const toggle = screen.getByRole("button", {
      name: "cashier.orderPanel.expandItem",
    });
    expect(toggle).toHaveTextContent("Cola");
    expect(toggle).toHaveTextContent("3×");
    expect(toggle).toHaveTextContent("30.00");
    expect(screen.getByLabelText("cashier.orderPanel.kdsPending")).toHaveClass(
      "bg-emerald-500"
    );
    fireEvent.click(toggle);
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.remove" })
    );
    expect(onRemoveLine).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "line-2",
        quantity: "3.0000",
        groupedLineIds: ["line-1", "line-2"],
      })
    );
  });

  it("blocks finance printing while a bill quote is unavailable", () => {
    render(<OrderPanel {...defaultProps} isPayView checkoutBlocked onPrintFinance={vi.fn()} />);
    expect(screen.getByRole("button", { name: "cashier.printFinance" })).toBeDisabled();
  });

  it("marks pending KDS lines green and hides the marker after they are sent", () => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedOrderLines={[
          new SalesOrderLine({ ...line, productName: "Pending coffee" }),
          new SalesOrderLine({
            ...line,
            id: "line-sent",
            variantId: "variant-2",
            productName: "Sent coffee",
            firedAt: "2026-10-28T10:00:00.000Z",
          }),
        ]}
      />
    );

    expect(screen.getByLabelText("cashier.orderPanel.kdsPending")).toHaveClass(
      "bg-emerald-500"
    );
    expect(screen.getAllByLabelText("cashier.orderPanel.kdsPending")).toHaveLength(1);
  });

  it("starts with compact summaries and reveals details only when expanded", async () => {
    const user = userEvent.setup();
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        selectedOrderLines={[
          new SalesOrderLine({ ...line, productName: "Coffee", variantName: "Large", quantity: "2.0000" }),
        ]}
      />
    );

    const toggle = screen.getByRole("button", { name: "cashier.orderPanel.expandItem" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("Coffee");
    expect(toggle).toHaveTextContent("2×");
    expect(toggle).toHaveTextContent("20.00");
    expect(screen.queryByText("Large")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "cashier.orderPanel.remove" })).not.toBeInTheDocument();

    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cashier.orderPanel.remove" })).toBeInTheDocument();

    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Large")).not.toBeInTheDocument();
  });

  it("opens only one item at a time and collapses when switching orders", () => {
    const props = {
      ...defaultProps,
      selectedOrder: new SalesOrder({ ...paidOrder, status: "DRAFT" }),
      selectedOrderLines: [line, new SalesOrderLine({ ...line, id: "line-2", variantId: "variant-2", productName: "Tea", variantName: "Small" })],
    };
    const { rerender } = render(<OrderPanel {...props} />);

    fireEvent.click(screen.getAllByRole("button", { name: "cashier.orderPanel.expandItem" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
    expect(screen.getAllByRole("button", { name: "cashier.orderPanel.collapseItem" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "cashier.orderPanel.remove" })).toHaveLength(1);
    expect(screen.getByText("Small")).toBeInTheDocument();

    rerender(<OrderPanel {...props} selectedOrder={new SalesOrder({ ...props.selectedOrder, id: "order-2" })} />);
    expect(screen.queryByRole("button", { name: "cashier.orderPanel.collapseItem" })).not.toBeInTheDocument();
    expect(screen.queryByText("Small")).not.toBeInTheDocument();
  });

  it("preserves line actions inside the expanded row", () => {
    const onIncreaseLineQuantity = vi.fn();
    const onDecreaseLineQuantity = vi.fn();
    const onRemoveLine = vi.fn();
    const onToggleFoc = vi.fn();
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        onIncreaseLineQuantity={onIncreaseLineQuantity}
        onDecreaseLineQuantity={onDecreaseLineQuantity}
        onRemoveLine={onRemoveLine}
        onToggleFoc={onToggleFoc}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
    for (const action of ["increaseQuantity", "decreaseQuantity", "foc", "remove"]) {
      fireEvent.click(screen.getByRole("button", { name: `cashier.orderPanel.${action}` }));
    }
    for (const callback of [onIncreaseLineQuantity, onDecreaseLineQuantity, onToggleFoc, onRemoveLine]) {
      expect(callback).toHaveBeenCalledExactlyOnceWith(line);
    }
    expect(screen.getByRole("button", { name: "cashier.orderPanel.collapseItem" })).toHaveAttribute("aria-expanded", "true");
  });

  it.each([{ isLoading: true }, { selectedOrder: paidOrder }])("keeps expanded line actions disabled for %j", (overrides) => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        onToggleFoc={vi.fn()}
        {...overrides}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
    for (const action of ["increaseQuantity", "decreaseQuantity", "foc", "remove"]) {
      expect(screen.getByRole("button", { name: `cashier.orderPanel.${action}` })).toBeDisabled();
    }
  });

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
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
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
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
    expect(screen.getByText("cashier.orderPanel.promoSaving")).toBeInTheDocument();
    expect(screen.getByText("cashier.orderPanel.promotionDiscount")).toBeInTheDocument();
    expect(screen.getByText("−1.00")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
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
    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("shows money with two decimals", () => {
    render(
      <OrderPanel
        {...defaultProps}
        selectedOrder={new SalesOrder({ ...paidOrder, status: "DRAFT" })}
        total="2600.0000"
        selectedOrderLines={[
          new SalesOrderLine({ ...line, unitPrice: "2600.0000", quantity: "1.0000" }),
        ]}
      />
    );

    // The line price, what the line costs and the total, never four decimals.
    expect(screen.getAllByText("2,600.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("2600.0000")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "cashier.orderPanel.expandItem" }));
    expect(screen.getByText("Large")).toBeInTheDocument();
  });
});
