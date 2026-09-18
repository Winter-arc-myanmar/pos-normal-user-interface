import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../api/HttpClient";
import { ApiSalesOrderRepository } from "../ApiSalesOrderRepository";

describe("ApiSalesOrderRepository", () => {
  it("maps customer names, item summaries, and product labels from nested payloads", async () => {
    const get = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order-1",
          tenantId: "tenant-1",
          locationId: "location-1",
          orderNumber: "SO-001",
          serviceType: "COUNTER",
          status: "DRAFT",
          grandTotal: "0.0000",
          customer: { fullName: "Jane Doe" },
          lines: [
            {
              id: "line-1",
              variantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              quantity: "1.0000",
              unitPrice: "10.0000",
              product: { name: "Coffee" },
            },
          ],
        },
      ],
    });
    const repository = new ApiSalesOrderRepository({
      get,
    } as unknown as HttpClient);

    const result = await repository.getSalesOrders({ page: 1, limit: 20 });
    expect(result.orders[0]).toMatchObject({
      customerName: "Jane Doe",
      itemCount: 1,
      itemSummary: "Coffee",
      serviceType: "PICK_UP",
    });

    get.mockResolvedValueOnce({
      data: [
        {
          id: "line-1",
          variantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          quantity: "2.0000",
          unitPrice: "5.0000",
          product: { name: "Tea" },
          variant: { variantSku: "TEA-L" },
        },
      ],
    });
    const lines = await repository.getSalesOrderLines("order-1");
    expect(lines.lines[0]).toMatchObject({
      productName: "Tea",
      sku: "TEA-L",
    });
  });
});
