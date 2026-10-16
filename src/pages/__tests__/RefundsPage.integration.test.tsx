import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RefundsPage } from "../RefundsPage";

const mocks = vi.hoisted(() => ({
  listRefundsForOrder: vi.fn(),
  getRefundById: vi.fn(),
  createRefund: vi.fn(),
  clearSelection: vi.fn(),
  fetchOrderLines: vi.fn(),
  selectedRefund: { current: null as Record<string, unknown> | null },
  orderLines: { current: [] as Array<Record<string, unknown>> },
}));

const orderLines = [
  { id: "line-1", productName: "Thai massage", quantity: "1.0000", unitPrice: "30000.0000" },
  { id: "line-2", productName: "Lime juice", quantity: "2.0000", unitPrice: "2500.0000" },
];

const refund = {
  returnId: "return-1",
  returnNumber: "RET-20260403-0001",
  salesOrderId: "order-1",
  reason: "Defective product",
  refundMethod: "CASH",
  subtotalRefund: "29.9900",
  taxRefund: "2.1000",
  totalRefund: "32.0900",
  orderStatus: "PARTIALLY_REFUNDED",
  lines: [
    {
      id: "line-return-1",
      salesOrderLineId: "line-1",
      returnedQuantity: "1.0000",
      unitPrice: "29.9900",
      lineDiscount: "0.0000",
      taxAmount: "2.1000",
      lineRefund: "32.0900",
    },
  ],
  createdAt: "2026-04-03T10:30:00.000Z",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "refunds.processed") {
        return `Refund ${options?.number} processed. Total ${options?.total}.`;
      }
      const labels: Record<string, string> = {
        "refunds.salesOrderId": "Sales order",
        "refunds.load": "Load refunds",
        "refunds.search": "Search refunds",
        "refunds.newRefund": "New refund",
        "refunds.reason": "Reason",
        "refunds.reasonPlaceholder": "Defective product",
        "refunds.refundMethod": "Refund method",
        "refunds.posSession": "POS session",
        "refunds.lineId": "Sales order line",
        "refunds.item": "Item",
        "refunds.selectItem": "Select item",
        "refunds.noOrderLines": "No items on this sales order to refund.",
        "refunds.loadingItems": "Loading items...",
        "refunds.enterOrderForItems": "Enter a sales order to load its items.",
        "refunds.errors.itemsFailed": "Could not load the order's items.",
        "refunds.returnedQty": "Returned qty",
        "refunds.process": "Process refund",
        "refunds.enterOrder": "Enter a sales order to load its refunds",
      };
      return labels[key] || key;
    },
  }),
}));

vi.mock("@/lib/i18n/formatters", () => ({
  useNumberFormatter: () => ({
    formatCurrency: (value: number) => value.toFixed(2),
  }),
  useDateFormatter: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: { tenantId: "tenant-1" } }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({ activePosSessionId: "session-1" }),
}));

vi.mock("@/core/presentation/hooks/useSalesOrderManagement", () => ({
  useSalesOrderManagement: () => ({
    orderLines: mocks.orderLines.current,
    fetchOrderLines: mocks.fetchOrderLines,
    isLoading: false,
  }),
}));

vi.mock("@/core/presentation/hooks/useRefundManagement", () => ({
  useRefundManagement: () => ({
    refunds: mocks.listRefundsForOrder.mock.results.length ? [refund] : [],
    selectedRefund: mocks.selectedRefund.current,
    isLoading: false,
    error: null,
    listRefundsForOrder: mocks.listRefundsForOrder,
    getRefundById: mocks.getRefundById,
    createRefund: mocks.createRefund,
    clearSelection: mocks.clearSelection,
  }),
}));

describe("RefundsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRefundsForOrder.mockResolvedValue({
      refunds: [refund],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    mocks.getRefundById.mockResolvedValue(refund);
    mocks.createRefund.mockResolvedValue(refund);
    mocks.fetchOrderLines.mockImplementation(async () => {
      mocks.orderLines.current = orderLines;
      return {
        lines: orderLines,
        total: orderLines.length,
        page: 1,
        limit: 50,
        totalPages: 1,
      };
    });
    mocks.orderLines.current = [];
    mocks.selectedRefund.current = null;
  });

  it("loads the order's items and refunds one picked by name", async () => {
    render(<RefundsPage />);

    fireEvent.change(screen.getAllByLabelText("Sales order")[0], {
      target: { value: "order-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load refunds" }));

    await waitFor(() => {
      expect(mocks.listRefundsForOrder).toHaveBeenCalledWith("order-1", {
        page: 1,
        limit: 10,
        search: undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
    });
    await waitFor(() => {
      expect(mocks.fetchOrderLines).toHaveBeenCalledWith("order-1", { page: 1, limit: 50 });
    });

    const item = await screen.findByLabelText("Item");
    expect(item).toHaveTextContent("Thai massage — 1 × 30000.00");
    expect(item).toHaveTextContent("Lime juice — 2 × 2500.00");

    fireEvent.change(screen.getByPlaceholderText("Defective product"), {
      target: { value: "Defective product" },
    });
    fireEvent.change(item, { target: { value: "line-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Process refund" }));

    await waitFor(() => {
      expect(mocks.createRefund).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        salesOrderId: "order-1",
        reason: "Defective product",
        refundMethod: "CASH",
        posSessionId: "session-1",
        items: [{ salesOrderLineId: "line-1", returnedQuantity: "1" }],
      });
    });
  });

  it("shows a refunded item by its name", async () => {
    mocks.selectedRefund.current = refund;
    render(<RefundsPage />);

    fireEvent.change(screen.getAllByLabelText("Sales order")[0], {
      target: { value: "order-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load refunds" }));
    fireEvent.click(await screen.findByRole("button", { name: /RET-20260403-0001/ }));

    expect(await screen.findByText("Thai massage")).toBeInTheDocument();
    expect(screen.getByText(/Sales order line line-1/)).toBeInTheDocument();
  });

  it("fills the item picker from the order field, even when the refunds call fails", async () => {
    mocks.listRefundsForOrder.mockRejectedValue(new Error("no refunds"));
    render(<RefundsPage />);

    const orderField = screen.getAllByLabelText("Sales order")[1];
    fireEvent.change(orderField, { target: { value: "order-1" } });
    fireEvent.blur(orderField);

    expect(await screen.findByText("Thai massage — 1 × 30000.00")).toBeInTheDocument();
    expect(mocks.fetchOrderLines).toHaveBeenCalledWith("order-1", { page: 1, limit: 50 });
  });

  it("says why the item picker is empty", async () => {
    mocks.fetchOrderLines.mockRejectedValue(new Error("boom"));
    render(<RefundsPage />);

    expect(screen.getByText("Enter a sales order to load its items.")).toBeInTheDocument();

    const orderField = screen.getAllByLabelText("Sales order")[1];
    fireEvent.change(orderField, { target: { value: "order-1" } });
    fireEvent.blur(orderField);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the order's items."
    );
  });
});
