import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../api/HttpClient";
import { ApiRefundRepository } from "../ApiRefundRepository";

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
      variantId: "variant-1",
      returnedQuantity: "1.0000",
      unitPrice: "29.9900",
      lineDiscount: "0.0000",
      taxAmount: "2.1000",
      lineRefund: "32.0900",
    },
  ],
  createdAt: "2026-04-03T10:30:00.000Z",
};

describe("ApiRefundRepository", () => {
  it("posts a refund and maps the envelope", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: refund,
    });
    const repository = new ApiRefundRepository({ post } as unknown as HttpClient);

    const created = await repository.createRefund({
      salesOrderId: "order-1",
      reason: "Defective product",
      refundMethod: "CASH",
      posSessionId: "session-1",
      tenantId: "tenant-1",
      items: [{ salesOrderLineId: "line-1", returnedQuantity: "1.0000" }],
    });

    expect(created.returnNumber).toBe("RET-20260403-0001");
    expect(created.lines[0].lineRefund).toBe("32.0900");
    expect(post).toHaveBeenCalledWith("/api/v1/refunds", {
      salesOrderId: "order-1",
      reason: "Defective product",
      refundMethod: "CASH",
      posSessionId: "session-1",
      items: [{ salesOrderLineId: "line-1", returnedQuantity: "1.0000" }],
      tenantId: "tenant-1",
    });
  });

  it("lists refunds for a sales order", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      data: [refund],
    });
    const repository = new ApiRefundRepository({ get } as unknown as HttpClient);

    const list = await repository.listRefundsForOrder("order-1", {
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(list.refunds).toHaveLength(1);
    expect(list.total).toBe(1);
    expect(get).toHaveBeenCalledWith("/api/v1/refunds/order/order-1", {
      params: { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" },
    });
  });
});
