import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesOrdersPage } from "../SalesOrdersPage";

const mocks = vi.hoisted(() => ({
  fetchOrders: vi.fn(),
  fetchOrderById: vi.fn(),
  fetchOrderLines: vi.fn(),
  createOrder: vi.fn(),
  deleteOrder: vi.fn(),
}));

const order = {
  id: "order-1",
  tenantId: "tenant-1",
  locationId: "location-1",
  orderNumber: "SO-001",
  salesChannel: "POS",
  serviceType: "DINE_IN",
  status: "DRAFT",
  subtotal: "10.0000",
  totalDiscount: "0.0000",
  totalTax: "0.0000",
  grandTotal: "10.0000",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        "salesOrders.tabs.storing": "Storing",
        "salesOrders.tabs.takenOut": "Taken out",
        "salesOrders.tabs.invalid": "Invalid",
        "salesOrders.search": "Phone number, name, code",
        "salesOrders.create": "Create sales order",
        "salesOrders.empty": "No data",
        "salesOrders.detailTitle": "Sales order",
        "salesOrders.lines": "Order lines",
        "salesOrders.noLines": "No lines on this order",
        "salesOrders.total": "Total",
        "salesOrders.created": `Order ${options?.number ?? ""} created`,
        "common.delete": "Delete",
        "common.cancel": "Cancel",
      };
      return labels[key] || key;
    },
  }),
}));

vi.mock("@/lib/i18n/formatters", () => ({
  useDateFormatter: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", tenantId: "tenant-1" },
  }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({
    activeLocationId: "location-1",
  }),
}));

vi.mock("@/core/presentation/hooks/useSalesOrderManagement", () => ({
  useSalesOrderManagement: () => ({
    orders: [order],
    page: 1,
    totalPages: 1,
    selectedOrder: null,
    orderLines: [],
    isLoading: false,
    error: null,
    fetchOrders: mocks.fetchOrders,
    fetchOrderById: mocks.fetchOrderById,
    fetchOrderLines: mocks.fetchOrderLines,
    createOrder: mocks.createOrder,
    deleteOrder: mocks.deleteOrder,
    updateOrder: vi.fn(),
    addOrderLine: vi.fn(),
    updateOrderLine: vi.fn(),
    deleteOrderLine: vi.fn(),
    fireOrderLine: vi.fn(),
    readyOrderLine: vi.fn(),
    serveOrderLine: vi.fn(),
    voidOrderLine: vi.fn(),
    compOrderLine: vi.fn(),
    clearSelectedOrder: vi.fn(),
    clearError: vi.fn(),
  }),
}));

describe("SalesOrdersPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchOrders.mockResolvedValue({
      orders: [order],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mocks.fetchOrderById.mockResolvedValue(order);
    mocks.fetchOrderLines.mockResolvedValue({ lines: [] });
    mocks.createOrder.mockResolvedValue(order);
  });

  it("loads orders and creates a draft sales order", async () => {
    render(<SalesOrdersPage />);

    await waitFor(() => expect(mocks.fetchOrders).toHaveBeenCalled());
    expect(screen.getByText("SO-001")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Create sales order" })
    );

    await waitFor(() =>
      expect(mocks.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          locationId: "location-1",
          status: "DRAFT",
        })
      )
    );
  });

  it("filters by status tab and opens order details", async () => {
    render(<SalesOrdersPage />);

    fireEvent.click(screen.getByRole("button", { name: "Taken out" }));
    await waitFor(() =>
      expect(mocks.fetchOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: "COMPLETED" })
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "SO-001" }));
    await waitFor(() => {
      expect(mocks.fetchOrderById).toHaveBeenCalledWith("order-1");
      expect(mocks.fetchOrderLines).toHaveBeenCalledWith("order-1", {
        page: 1,
        limit: 50,
      });
    });
  });
});
