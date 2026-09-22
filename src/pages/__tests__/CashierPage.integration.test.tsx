import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CashierPage } from "../CashierPage";

const mocks = vi.hoisted(() => ({
  addProductToTableSession: vi.fn(),
  checkoutTableSession: vi.fn(),
  closePosSession: vi.fn(),
  createPosRegister: vi.fn(),
  createPosSession: vi.fn(),
  fetchPosRegisters: vi.fn(),
  fetchPosSessions: vi.fn(),
  fetchProductVariants: vi.fn(),
  fireToKds: vi.fn(),
  getCounterOrderById: vi.fn(),
  pickupCounterOrder: vi.fn(),
  openTableSession: vi.fn(),
  selectOrderById: vi.fn(),
  updateDiningTableStatus: vi.fn(),
  updateTableSessionState: vi.fn(),
  fetchManagedOrderLines: vi.fn(),
  addManagedOrderLine: vi.fn(),
  deleteManagedOrderLine: vi.fn(),
  updateManagedOrder: vi.fn(),
  deleteManagedOrder: vi.fn(),
  voidCheckout: vi.fn(),
  refreshDiningTableStatus: vi.fn(),
}));

const product = {
  id: "product-1",
  tenantId: "tenant-1",
  name: "Coffee",
  basePrice: "10.0000",
  baseSku: "COFFEE",
  isTaxable: true,
  taxRate: 5,
  isPriceInclusive: false,
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
      id: "cashier-1",
      tenantId: "tenant-1",
      activeBranchId: "branch-1",
    },
  }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({
    activeLocationId: "location-1",
    activePosRegisterId: "register-1",
    activePosSessionId: "pos-session-1",
    isWorkspaceReady: true,
    isPosSessionLoading: false,
    isSetupModalOpen: false,
    requireCashierContext: vi.fn().mockResolvedValue({
      tenantId: "tenant-1",
      locationId: "location-1",
      posRegisterId: "register-1",
      posSessionId: "pos-session-1",
    }),
    refreshPosContext: vi.fn(),
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
    setActiveLocationId: vi.fn(),
    inventoryLocations: [{ id: "location-1", tenantId: "tenant-1", name: "Main", type: "store" }],
    fetchInventoryLocations: vi.fn().mockResolvedValue("location-1"),
    isLocationsLoading: false,
    isLoading: false,
    error: null,
    fetchProducts: vi.fn().mockResolvedValue(undefined),
    fetchProductVariants: mocks.fetchProductVariants,
    fetchSalesOrders: vi.fn().mockResolvedValue(undefined),
    fetchPaymentMethods: vi.fn().mockResolvedValue(undefined),
    fetchPosRegisters: mocks.fetchPosRegisters,
    createPosRegister: mocks.createPosRegister,
    fetchPosSessions: mocks.fetchPosSessions,
    createPosSession: mocks.createPosSession,
    closePosSession: mocks.closePosSession,
    fetchDiningZones: vi.fn().mockResolvedValue(undefined),
    fetchDiningTables: vi.fn().mockResolvedValue(undefined),
    fetchTableSessions: vi.fn().mockResolvedValue(undefined),
    refreshDiningTableStatus: mocks.refreshDiningTableStatus,
    updateDiningTableStatus: mocks.updateDiningTableStatus,
    openTableSession: mocks.openTableSession,
    checkoutTableSession: mocks.checkoutTableSession,
    updateTableSessionState: mocks.updateTableSessionState,
    fireToKds: mocks.fireToKds,
    getLatestSessionByTableId: vi.fn().mockReturnValue(session),
    selectOrder: vi.fn(),
    selectOrderById: mocks.selectOrderById,
    createOrder: vi.fn(),
    addProductToOrder: vi.fn(),
    updateOrderLine: vi.fn(),
    removeOrderLine: vi.fn(),
    addProductToTableSession: mocks.addProductToTableSession,
    getCounterOrderById: mocks.getCounterOrderById,
    pickupCounterOrder: mocks.pickupCounterOrder,
    processCheckout: vi.fn(),
    voidCheckout: mocks.voidCheckout,
    discountReasons: [],
    fetchDiscountReasons: vi.fn().mockResolvedValue(undefined),
    resolveTableWarning: vi.fn().mockReturnValue(null),
    clearOrderSelection: vi.fn(),
    clearError: vi.fn(),
  }),
}));

vi.mock("@/core/presentation/hooks/useSalesOrderManagement", () => ({
  useSalesOrderManagement: () => ({
    fetchOrderLines: mocks.fetchManagedOrderLines,
    addOrderLine: mocks.addManagedOrderLine,
    deleteOrderLine: mocks.deleteManagedOrderLine,
    updateOrder: mocks.updateManagedOrder,
    deleteOrder: mocks.deleteManagedOrder,
  }),
}));

vi.mock("@/core/presentation/hooks/useGuestWalletManagement", () => ({
  useGuestWalletManagement: () => ({
    lookupCard: vi.fn(),
    getWallet: vi.fn(),
  }),
}));

describe("CashierPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchProductVariants.mockResolvedValue([variant]);
    mocks.fetchManagedOrderLines.mockResolvedValue({
      lines: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    mocks.fetchPosRegisters.mockResolvedValue([
      {
        id: "register-1",
        tenantId: "tenant-1",
        locationId: "location-1",
        code: "R-01",
        name: "Register 1",
      },
    ]);
    mocks.fetchPosSessions.mockResolvedValue([
      {
        id: "pos-session-1",
        tenantId: "tenant-1",
        registerId: "register-1",
        cashierId: "cashier-1",
        status: "OPEN",
        closedAt: null,
      },
    ]);
    mocks.createPosRegister.mockResolvedValue({
      id: "register-1",
      tenantId: "tenant-1",
      locationId: "location-1",
      code: "R-01",
      name: "Register 1",
    });
    mocks.createPosSession.mockResolvedValue({
      id: "pos-session-1",
      tenantId: "tenant-1",
      registerId: "register-1",
      cashierId: "cashier-1",
      status: "OPEN",
      closedAt: null,
    });
    mocks.closePosSession.mockResolvedValue({
      id: "pos-session-1",
      tenantId: "tenant-1",
      registerId: "register-1",
      cashierId: "cashier-1",
      status: "CLOSED",
      closedAt: "2026-08-29T00:00:00Z",
    });
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
    mocks.refreshDiningTableStatus.mockResolvedValue(true);
    mocks.getCounterOrderById.mockResolvedValue({ id: "order-1" });
    mocks.pickupCounterOrder.mockResolvedValue({ id: "order-1" });
    mocks.fireToKds.mockResolvedValue({});
    mocks.checkoutTableSession.mockResolvedValue({
      ...session,
      sessionState: "CLOSED",
    });
    mocks.updateManagedOrder.mockResolvedValue({
      ...order,
      status: "VOIDED",
    });
    mocks.voidCheckout.mockResolvedValue({ orderId: "order-1" });
    mocks.selectOrderById.mockResolvedValue(order);
    mocks.openTableSession.mockResolvedValue(session);
  });

  it("loads variants and adds a product to a table session", async () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=menu"]}>
        <CashierPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Coffee/ }));

    await waitFor(() =>
      expect(mocks.addProductToTableSession).toHaveBeenCalledWith(
        "session-1",
        product,
        "variant-1",
        1,
        undefined
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

    expect(screen.queryAllByText("10.50").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.sendKds" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.pickedUp" })
    );
    fireEvent.click(screen.getByRole("button", { name: "cashier.confirmPay" }));

    await waitFor(() => {
      expect(mocks.fireToKds).toHaveBeenCalledWith({
        sessionId: "session-1",
      });
      expect(mocks.getCounterOrderById).toHaveBeenCalledWith("order-1");
      expect(mocks.pickupCounterOrder).toHaveBeenCalledWith("order-1");
      expect(mocks.checkoutTableSession).toHaveBeenCalledWith("session-1", {
        payments: [{ paymentMethodId: "cash", amount: "10.5000" }],
      });
      expect(mocks.updateTableSessionState).toHaveBeenCalledWith("session-1", {
        sessionState: "CLOSED",
      });
      expect(mocks.updateDiningTableStatus).toHaveBeenCalledWith(
        "table-1",
        "AVAILABLE"
      );
    });
  });

  it("refetches table status on an interval without waiting for a click", async () => {
    vi.useFakeTimers();
    try {
      render(
        <MemoryRouter initialEntries={["/cashier?view=orders"]}>
          <CashierPage />
        </MemoryRouter>
      );

      expect(mocks.refreshDiningTableStatus).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(60_000);

      expect(mocks.refreshDiningTableStatus).toHaveBeenCalledTimes(1);
      expect(mocks.refreshDiningTableStatus).toHaveBeenCalledWith("tables");
    } finally {
      vi.useRealTimers();
    }
  });

  it("connects table status and table-session state controls", async () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=orders"]}>
        <CashierPage />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole("button", { name: /cashier.status.paid/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cashier.status.all/i })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("cashier.orderPanel.tableStatus"), {
      target: { value: "DIRTY" },
    });
    fireEvent.change(screen.getByLabelText("cashier.orderPanel.sessionState"), {
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

  it("opens an occupied table's existing order instead of creating a session", async () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=orders"]}>
        <CashierPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /T1/ }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("cashier.productMenu.search")
      ).toBeInTheDocument();
    });
    expect(mocks.openTableSession).not.toHaveBeenCalled();
    expect(mocks.updateDiningTableStatus).not.toHaveBeenCalled();
  });

  it("cancels an unpaid order without calling checkout void", async () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=orders"]}>
        <CashierPage />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.cancelOrder" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.orderPanel.confirmCancelOrder" })
    );

    await waitFor(() => {
      expect(mocks.updateManagedOrder).toHaveBeenCalledWith("order-1", {
        status: "VOIDED",
      });
      expect(mocks.voidCheckout).not.toHaveBeenCalled();
      expect(mocks.updateTableSessionState).toHaveBeenCalledWith("session-1", {
        sessionState: "CLOSED",
      });
      expect(mocks.updateDiningTableStatus).toHaveBeenCalledWith(
        "table-1",
        "AVAILABLE"
      );
    });
  });
});
