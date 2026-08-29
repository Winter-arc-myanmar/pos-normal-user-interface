import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CashierPage } from "../CashierPage";

const mocks = vi.hoisted(() => ({
  addProductToTableSession: vi.fn(),
  checkoutTableSession: vi.fn(),
  fetchProductVariants: vi.fn(),
  fireToKds: vi.fn(),
  getCounterOrderById: vi.fn(),
  pickupCounterOrder: vi.fn(),
  updateDiningTableStatus: vi.fn(),
  updateTableSessionState: vi.fn(),
}));

const product = {
  id: "product-1",
  tenantId: "tenant-1",
  name: "Coffee",
  basePrice: "10.0000",
  baseSku: "COFFEE",
};

const variant = {
  id: "variant-1",
  productId: "product-1",
  variantSku: "COFFEE-LARGE",
};

const order = {
  id: "order-1",
  tenantId: "tenant-1",
  locationId: "branch-1",
  orderNumber: "POS-001",
  salesChannel: "POS",
  serviceType: "PICK_UP",
  status: "DRAFT",
  grandTotal: "10.0000",
  subtotal: "10.0000",
  totalTax: "0.0000",
  totalDiscount: "0.0000",
  createdAt: "",
  updatedAt: "",
};

const session = {
  id: "session-1",
  tenantId: "tenant-1",
  tableId: "table-1",
  guestCount: 2,
  openedAt: "2026-08-29T00:00:00Z",
  closedAt: null,
  salesOrderId: "order-1",
  sessionState: "SEATED",
};

const table = {
  id: "table-1",
  tenantId: "tenant-1",
  zoneId: "zone-1",
  tableNumber: "T1",
  maxSeats: 4,
  status: "OCCUPIED",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      tenantId: "tenant-1",
      activeBranchId: "branch-1",
    },
  }),
}));

vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    products: [product],
    variantsByProductId: { "product-1": [variant] },
    salesOrders: [order],
    selectedOrder: order,
    selectedOrderLines: [
      {
        id: "line-1",
        salesOrderId: "order-1",
        variantId: "variant-1",
        quantity: "1.0000",
        unitPrice: "10.0000",
        lineDiscount: "0.0000",
        taxAmount: "0.0000",
      },
    ],
    paymentMethods: [
      { id: "cash", tenantId: "tenant-1", name: "Cash" },
    ],
    diningZones: [],
    diningTables: [table],
    tableSessions: [session],
    activeServiceType: "TABLE",
    setActiveServiceType: vi.fn(),
    activeLocationId: "location-1",
    inventoryLocations: [{ id: "location-1", tenantId: "tenant-1", name: "Main", type: "store" }],
    fetchInventoryLocations: vi.fn().mockResolvedValue("location-1"),
    isLocationsLoading: false,
    isLoading: false,
    error: null,
    fetchProducts: vi.fn().mockResolvedValue(undefined),
    fetchProductVariants: mocks.fetchProductVariants,
    fetchSalesOrders: vi.fn().mockResolvedValue(undefined),
    fetchPaymentMethods: vi.fn().mockResolvedValue(undefined),
    fetchDiningZones: vi.fn().mockResolvedValue(undefined),
    fetchDiningTables: vi.fn().mockResolvedValue(undefined),
    fetchTableSessions: vi.fn().mockResolvedValue(undefined),
    updateDiningTableStatus: mocks.updateDiningTableStatus,
    openTableSession: vi.fn(),
    checkoutTableSession: mocks.checkoutTableSession,
    updateTableSessionState: mocks.updateTableSessionState,
    fireToKds: mocks.fireToKds,
    getLatestSessionByTableId: vi.fn().mockReturnValue(session),
    selectOrder: vi.fn(),
    selectOrderById: vi.fn().mockResolvedValue(undefined),
    createOrder: vi.fn(),
    addProductToOrder: vi.fn(),
    updateOrderLine: vi.fn(),
    removeOrderLine: vi.fn(),
    addProductToTableSession: mocks.addProductToTableSession,
    getCounterOrderById: mocks.getCounterOrderById,
    pickupCounterOrder: mocks.pickupCounterOrder,
    processCheckout: vi.fn(),
    clearError: vi.fn(),
  }),
}));

describe("CashierPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchProductVariants.mockResolvedValue([variant]);
    mocks.addProductToTableSession.mockResolvedValue({
      id: "line-2",
      salesOrderId: "order-1",
    });
    mocks.updateTableSessionState.mockResolvedValue({
      ...session,
      sessionState: "ORDERING",
    });
    mocks.updateDiningTableStatus.mockResolvedValue({
      ...table,
      status: "DIRTY",
    });
    mocks.getCounterOrderById.mockResolvedValue({ id: "order-1" });
    mocks.pickupCounterOrder.mockResolvedValue({ id: "order-1" });
    mocks.fireToKds.mockResolvedValue({});
    mocks.checkoutTableSession.mockResolvedValue({
      ...session,
      sessionState: "CLOSED",
    });
  });

  it("loads variants and adds a product to a table session", async () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=menu"]}>
        <CashierPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Coffee/ }));
    await screen.findByRole("button", {
      name: "cashier.productMenu.add",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.productMenu.add" })
    );

    await waitFor(() =>
      expect(mocks.addProductToTableSession).toHaveBeenCalledWith(
        "session-1",
        product,
        "variant-1",
        1
      )
    );
    expect(mocks.updateTableSessionState).toHaveBeenCalledWith("session-1", {
      sessionState: "ORDERING",
    });
  });

  it("syncs totals and connects checkout, KDS, and pickup actions", async () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=pay"]}>
        <CashierPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("cashier.orderPanel.paymentAmount")).toHaveValue(
      "10.0000"
    );

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.sendKds" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.pickedUp" })
    );
    fireEvent.click(screen.getByRole("button", { name: "cashier.payNow" }));

    await waitFor(() => {
      expect(mocks.fireToKds).toHaveBeenCalledWith({
        sessionId: "session-1",
      });
      expect(mocks.getCounterOrderById).toHaveBeenCalledWith("order-1");
      expect(mocks.pickupCounterOrder).toHaveBeenCalledWith("order-1");
      expect(mocks.checkoutTableSession).toHaveBeenCalledWith("session-1", {
        payments: [{ paymentMethodId: "cash", amount: "10.0000" }],
      });
    });
  });

  it("connects table status and table-session state controls", async () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=orders"]}>
        <CashierPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Table status"), {
      target: { value: "DIRTY" },
    });
    fireEvent.change(screen.getByLabelText("Table session state"), {
      target: { value: "SERVED" },
    });

    await waitFor(() => {
      expect(mocks.updateDiningTableStatus).toHaveBeenCalledWith(
        "table-1",
        "DIRTY"
      );
      expect(mocks.updateTableSessionState).toHaveBeenCalledWith("session-1", {
        sessionState: "SERVED",
      });
    });
  });
});
