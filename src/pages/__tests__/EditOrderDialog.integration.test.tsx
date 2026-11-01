import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderPayment, SalesOrder, SalesOrderLine } from "@/core/domain/entities/Cashier";
import { EditOrderDialog } from "../salesOrders/EditOrderDialog";

const mocks = vi.hoisted(() => ({
  selectOrder: vi.fn(),
  approve: vi.fn(),
  lookupCard: vi.fn(),
  previewEdit: vi.fn(),
  saveEdit: vi.fn(),
  onSaved: vi.fn(),
}));

const order = new SalesOrder({
  id: "order-1",
  orderNumber: "SO-42",
  status: "COMPLETED",
  totalDiscount: "0.0000",
  totalTax: "0.0000",
  serviceCharge: "0.0000",
  grandTotal: "15000.0000",
});

const lines = [
  new SalesOrderLine({
    id: "beer",
    salesOrderId: "order-1",
    variantId: "variant-beer",
    productName: "Beer",
    quantity: "3.0000",
    unitPrice: "3000.0000",
    status: "SERVED",
  }),
  new SalesOrderLine({
    id: "rice",
    salesOrderId: "order-1",
    variantId: "variant-rice",
    productName: "Rice",
    quantity: "1.0000",
    unitPrice: "6000.0000",
    status: "SERVED",
  }),
];

let payments: OrderPayment[] = [];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${Object.values(options).join(" ")}` : key,
  }),
}));

vi.mock("@/lib/i18n/formatters", () => ({
  useNumberFormatter: () => ({ formatCurrency: (value: number) => `${value}` }),
}));

vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    products: [],
    fetchProducts: vi.fn(),
    fetchProductVariants: vi.fn(),
    paymentMethods: [
      { id: "cash", tenantId: "t", name: "Cash", kind: "CASH" },
      { id: "card", tenantId: "t", name: "Guest Card", kind: "GUEST_CARD" },
    ],
    fetchPaymentMethods: vi.fn(),
    discountReasons: [],
    fetchDiscountReasons: vi.fn(),
    selectOrder: mocks.selectOrder,
    selectedOrderLines: lines,
    selectedOrderPayments: payments,
  }),
}));

vi.mock("@/core/presentation/hooks/useCustomerManagement", () => ({
  useCustomerManagement: () => ({ getCustomers: vi.fn() }),
}));

vi.mock("@/core/presentation/hooks/useGuestWalletManagement", () => ({
  useGuestWalletManagement: () => ({ lookupCard: mocks.lookupCard }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({
    requireCashierContext: () => Promise.resolve({ posSessionId: "shift-1" }),
  }),
}));

vi.mock("@/components/shift/shiftApi", () => ({
  shiftApi: () => ({ approve: mocks.approve }),
}));

vi.mock("../spa/HostessPicker", () => ({ HostessPicker: () => null }));

vi.mock("../spa/CardTapDialog", () => ({
  CardTapDialog: ({ onCardRead }: { onCardRead: (uid: string) => void }) => (
    <button type="button" onClick={() => onCardRead("UID-1")}>
      tap card
    </button>
  ),
}));

const renderDialog = () =>
  render(
    <EditOrderDialog
      order={order}
      onClose={vi.fn()}
      onSaved={mocks.onSaved}
      previewEdit={mocks.previewEdit}
      saveEdit={mocks.saveEdit}
    />
  );

const signOff = () => {
  fireEvent.change(screen.getByPlaceholderText("salesOrders.edit.reasonPlaceholder"), {
    target: { value: "Wrong beer quantity" },
  });
  fireEvent.change(screen.getByLabelText("shift.managerId"), { target: { value: "MGR0001" } });
  fireEvent.change(screen.getByLabelText("shift.managerPassword"), { target: { value: "secret" } });
};

const preview = (difference: string, newTotal: string) => ({
  previousTotal: "15000.0000",
  subtotal: newTotal,
  totalDiscount: "0.0000",
  totalTax: "0.0000",
  serviceCharge: "0.0000",
  tipAmount: "0.0000",
  newTotal,
  difference,
});

describe("EditOrderDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    payments = [
      new OrderPayment({ id: "pay-1", salesOrderId: "order-1", paymentMethodId: "cash", amount: "15000.0000" }),
    ];
    mocks.selectOrder.mockResolvedValue(undefined);
    mocks.approve.mockResolvedValue({ token: "approval-token" });
    mocks.saveEdit.mockResolvedValue({ orderNumber: "SO-42" });
  });

  it("refunds the difference in the open shift once a manager signs off", async () => {
    mocks.previewEdit.mockResolvedValue(preview("0.0000", "15000.0000"));
    renderDialog();
    mocks.previewEdit.mockResolvedValue(preview("-3000.0000", "12000.0000"));
    fireEvent.click(await screen.findByLabelText("salesOrders.edit.fewer Beer"));

    await waitFor(() =>
      expect(mocks.previewEdit).toHaveBeenLastCalledWith(
        "order-1",
        expect.objectContaining({
          lines: [
            { id: "beer", quantity: "2.0000", unitPrice: "3000.0000" },
            { id: "rice", quantity: "1.0000", unitPrice: "6000.0000" },
          ],
        })
      )
    );
    expect(await screen.findByText("salesOrders.edit.refund 3000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cash" }));
    signOff();
    fireEvent.click(screen.getByRole("button", { name: "salesOrders.edit.save" }));

    await waitFor(() => expect(mocks.onSaved).toHaveBeenCalled());
    expect(mocks.approve).toHaveBeenCalledWith("MGR0001", "secret", "sales:order-edit:approve");
    expect(mocks.saveEdit).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        reason: "Wrong beer quantity",
        posSessionId: "shift-1",
        settlement: { paymentMethodId: "cash" },
      }),
      "approval-token"
    );
  });

  it("asks why the order is being changed before saving", async () => {
    mocks.previewEdit.mockResolvedValue(preview("-3000.0000", "12000.0000"));
    renderDialog();
    fireEvent.click(await screen.findByLabelText("salesOrders.edit.fewer Beer"));
    await screen.findByText("salesOrders.edit.refund 3000");
    fireEvent.click(screen.getByRole("button", { name: "Cash" }));
    fireEvent.click(screen.getByRole("button", { name: "salesOrders.edit.save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("salesOrders.edit.errors.reason");
    expect(mocks.saveEdit).not.toHaveBeenCalled();
  });

  it("charges the extra to a tapped guest card", async () => {
    mocks.previewEdit.mockResolvedValue(preview("3000.0000", "18000.0000"));
    mocks.lookupCard.mockResolvedValue({ id: "guest-card-1" });
    renderDialog();
    fireEvent.click(await screen.findByLabelText("salesOrders.edit.more Beer"));
    await screen.findByText("salesOrders.edit.collect 3000");
    fireEvent.click(screen.getByRole("button", { name: "Guest Card" }));
    signOff();
    fireEvent.click(screen.getByRole("button", { name: "salesOrders.edit.save" }));
    fireEvent.click(await screen.findByRole("button", { name: "tap card" }));

    await waitFor(() =>
      expect(mocks.saveEdit).toHaveBeenCalledWith(
        "order-1",
        expect.objectContaining({
          settlement: { paymentMethodId: "card", guestCardId: "guest-card-1" },
        }),
        "approval-token"
      )
    );
    expect(mocks.lookupCard).toHaveBeenCalledWith("UID-1");
  });
});
