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
});
