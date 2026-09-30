import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RefundsPage } from "../RefundsPage";

const mocks = vi.hoisted(() => ({
  listRefundsForOrder: vi.fn(),
  getRefundById: vi.fn(),
  createRefund: vi.fn(),
  clearSelection: vi.fn(),
}));

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

vi.mock("@/core/presentation/hooks/useRefundManagement", () => ({
  useRefundManagement: () => ({
    refunds: mocks.listRefundsForOrder.mock.results.length ? [refund] : [],
    selectedRefund: null,
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
  });

  it("loads refunds for a sales order and submits a return", async () => {
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

    fireEvent.change(screen.getByPlaceholderText("Defective product"), {
      target: { value: "Defective product" },
    });
    fireEvent.change(screen.getByLabelText("Sales order line"), {
      target: { value: "line-1" },
    });
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
});
