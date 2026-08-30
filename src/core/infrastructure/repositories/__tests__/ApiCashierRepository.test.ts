import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../api/HttpClient";
import { ApiCashierRepository } from "../ApiCashierRepository";

describe("ApiCashierRepository", () => {
  it("normalizes nested paginated list responses", async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({
        success: true,
        data: {
          page: 1,
          total: 1,
          items: [
            {
              id: "product-1",
              tenantId: "tenant-1",
              name: "Coffee",
              basePrice: "10.0000",
              baseSku: "COFFEE",
              isTaxable: true,
              taxRate: {
                id: "tax-1",
                name: "Commercial Tax",
                ratePercentage: "5.0000",
                isPriceInclusive: false,
              },
            },
          ],
        },
      }),
    };
    const repository = new ApiCashierRepository(
      httpClient as unknown as HttpClient
    );

    const products = await repository.getProducts({ page: 1, limit: 20 });

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: "product-1",
      name: "Coffee",
      basePrice: "10.0000",
      isTaxable: true,
      taxRate: 5,
      isPriceInclusive: false,
    });
  });

  it("normalizes waitlist, tip-pool allocation, and counter-order envelopes", async () => {
    const httpClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            data: {
              waitlist: [
                {
                  id: "wait-1",
                  guestName: "John",
                  guestPhone: "555",
                  partySize: 2,
                  status: "WAITING",
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            allocations: [
              {
                id: "allocation-1",
                tipPoolId: "pool-1",
                userId: "user-1",
                role: "SERVER",
                amount: "25.0000",
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              order: { id: "counter-1" },
              lines: [{ id: "line-1" }],
              kdsTickets: [{ id: "ticket-1" }],
            },
          },
        }),
    };
    const repository = new ApiCashierRepository(
      httpClient as unknown as HttpClient
    );

    const waitlist = await repository.getWaitlist();
    const allocations = await repository.getTipPoolAllocations("pool-1");
    const counterOrder = await repository.getCounterOrderById("counter-1");

    expect(waitlist[0]).toMatchObject({
      id: "wait-1",
      guestName: "John",
      status: "WAITING",
    });
    expect(allocations[0]).toMatchObject({
      id: "allocation-1",
      userId: "user-1",
      amount: "25.0000",
    });
    expect(counterOrder).toMatchObject({
      order: { id: "counter-1" },
      lines: [{ id: "line-1" }],
    });
  });

  it("sends numeric line fields for table session lines", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "line-1",
        salesOrderId: "order-1",
        variantId: "variant-1",
        quantity: 1,
        unitPrice: 10,
      },
    });
    const httpClient = { post };
    const repository = new ApiCashierRepository(
      httpClient as unknown as HttpClient
    );

    await repository.addTableSessionLine("session-1", {
      variantId: "variant-1",
      quantity: "1.0000",
      unitPrice: "10.0000",
      lineDiscount: "0.0000",
    });

    expect(post).toHaveBeenCalledWith(
      "/api/v1/table-sessions/session-1/lines",
      {
        variantId: "variant-1",
        quantity: 1,
        unitPrice: 10,
        lineDiscount: 0,
      }
    );
  });

  it("sends numeric payment amounts for table session checkout", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "session-1",
        sessionState: "CLOSED",
      },
    });
    const httpClient = { post };
    const repository = new ApiCashierRepository(
      httpClient as unknown as HttpClient
    );

    await repository.checkoutTableSession("session-1", {
      payments: [{ paymentMethodId: "cash", amount: "10.5000" }],
    });

    expect(post).toHaveBeenCalledWith(
      "/api/v1/table-sessions/session-1/checkout",
      {
        payments: [{ paymentMethodId: "cash", amount: 10.5 }],
      }
    );
  });

  it("sends decimal strings for direct checkout", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: { id: "checkout-1" },
    });
    const httpClient = { post };
    const repository = new ApiCashierRepository(
      httpClient as unknown as HttpClient
    );

    await repository.checkout({
      tenantId: "tenant-1",
      locationId: "location-1",
      salesChannel: "POS",
      serviceType: "DINE_IN",
      items: [
        {
          variantId: "variant-1",
          quantity: "1.0000",
          lineDiscount: "0.0000",
        },
      ],
      payments: [{ paymentMethodId: "cash", amount: "10.5000" }],
    });

    expect(post).toHaveBeenCalledWith("/api/v1/checkout", {
      tenantId: "tenant-1",
      locationId: "location-1",
      salesChannel: "POS",
      serviceType: "DINE_IN",
      items: [
        {
          variantId: "variant-1",
          quantity: "1.0000",
          lineDiscount: "0.0000",
        },
      ],
      payments: [{ paymentMethodId: "cash", amount: "10.5000" }],
    });
  });
});
