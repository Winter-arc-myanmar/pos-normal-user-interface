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
              categoryId: "cat-drinks",
              category: { id: "cat-drinks", name: "Drinks" },
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
      categoryId: "cat-drinks",
      categoryName: "Drinks",
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

  it("sends decimal strings for sales order lines", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "line-1",
        salesOrderId: "order-2",
        variantId: "variant-1",
        quantity: "1.0000",
        unitPrice: "10.0000",
      },
    });
    const httpClient = { post };
    const repository = new ApiCashierRepository(
      httpClient as unknown as HttpClient
    );

    await repository.addSalesOrderLine("order-2", {
      variantId: "variant-1",
      quantity: "1.0000",
      unitPrice: "10.0000",
      lineDiscount: "0.0000",
    });

    expect(post).toHaveBeenCalledWith(
      "/api/v1/sales-orders/order-2/lines",
      {
        variantId: "variant-1",
        quantity: "1.0000",
        unitPrice: "10.0000",
        lineDiscount: "0.0000",
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

  it("sends checkout tip, service charge, and discount reason", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: { orderId: "checkout-1" },
    });
    const repository = new ApiCashierRepository({
      post,
    } as unknown as HttpClient);

    await repository.checkout({
      tenantId: "tenant-1",
      locationId: "location-1",
      salesChannel: "POS",
      serviceType: "DINE_IN",
      tipAmount: "5.0000",
      serviceCharge: "3.0000",
      discountReasonId: "reason-1",
      items: [
        {
          variantId: "variant-1",
          quantity: "1.0000",
          lineDiscount: "5.0000",
        },
      ],
      payments: [
        {
          paymentMethodId: "cash",
          amount: "93.0000",
          tipAmount: "5.0000",
        },
      ],
    });

    expect(post).toHaveBeenCalledWith("/api/v1/checkout", {
      tenantId: "tenant-1",
      locationId: "location-1",
      salesChannel: "POS",
      serviceType: "DINE_IN",
      discountReasonId: "reason-1",
      tipAmount: "5.0000",
      serviceCharge: "3.0000",
      items: [
        {
          variantId: "variant-1",
          quantity: "1.0000",
          lineDiscount: "5.0000",
        },
      ],
      payments: [
        {
          paymentMethodId: "cash",
          amount: "93.0000",
          tipAmount: "5.0000",
        },
      ],
    });
  });

  it("sends guestCardId on member-card checkout payments", async () => {
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
      payments: [
        {
          paymentMethodId: "cash",
          amount: "4.0000",
        },
        {
          paymentMethodId: "member",
          amount: "6.5000",
          guestCardId: "card-1",
        },
      ],
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
      payments: [
        { paymentMethodId: "cash", amount: "4.0000" },
        {
          paymentMethodId: "member",
          amount: "6.5000",
          guestCardId: "card-1",
        },
      ],
    });
  });

  it("maps payment-methods list from kind/isActive/glAccountId", async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({
        success: true,
        message: "Request successful",
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
        data: [
          {
            id: "pm-cash",
            tenantId: "tenant-1",
            name: "Cash",
            kind: "CASH",
            isActive: true,
            glAccountId: "gl-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "pm-card",
            tenantId: "tenant-1",
            name: "Member Card",
            kind: "MEMBER_CARD",
            isActive: false,
            glAccountId: "gl-2",
          },
        ],
      }),
    };
    const repository = new ApiCashierRepository(
      httpClient as unknown as HttpClient
    );

    const methods = await repository.getPaymentMethods();

    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/payment-methods", {
      params: { page: 1, limit: 100 },
    });
    expect(methods).toHaveLength(1);
    expect(methods[0]).toMatchObject({
      id: "pm-cash",
      tenantId: "tenant-1",
      name: "Cash",
      kind: "CASH",
      code: "CASH",
      isActive: true,
      glAccountId: "gl-1",
    });
  });

  it("creates a sales order without serviceType", async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        id: "order-1",
        tenantId: "tenant-1",
        locationId: "location-1",
        serviceType: "TAKEAWAY",
        status: "DRAFT",
      },
    });
    const repository = new ApiCashierRepository({
      post,
    } as unknown as HttpClient);

    const order = await repository.createSalesOrder({
      tenantId: "tenant-1",
      locationId: "location-1",
      salesChannel: "POS",
      serviceType: "TAKE_AWAY",
      status: "DRAFT",
    });

    expect(post).toHaveBeenCalledWith("/api/v1/sales-orders", {
      tenantId: "tenant-1",
      locationId: "location-1",
      customerId: undefined,
      orderNumber: undefined,
      salesChannel: "POS",
      idempotencyKey: undefined,
      subtotal: undefined,
      totalDiscount: undefined,
      totalTax: undefined,
      grandTotal: undefined,
      status: "DRAFT",
    });
    expect(order.serviceType).toBe("TAKE_AWAY");
  });

  it("posts checkout void with only the sale id path", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      message: "Request successful",
      data: {
        orderId: "sale-1",
        orderNumber: "SO-20260402-0001",
        grandTotal: "95.0000",
        totalPaid: "100.0000",
        change: "5.0000",
        status: "COMPLETED",
      },
    });
    const repository = new ApiCashierRepository({
      post,
    } as unknown as HttpClient);

    const result = await repository.voidCheckout("sale-1");

    expect(post).toHaveBeenCalledWith("/api/v1/checkout/sale-1/void");
    expect(result).toEqual({
      orderId: "sale-1",
      orderNumber: "SO-20260402-0001",
      grandTotal: "95.0000",
      totalPaid: "100.0000",
      change: "5.0000",
      status: "COMPLETED",
    });
  });

  it("lists discount reasons without activeOnly query params", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: "reason-1", code: "STAFF", name: "Staff", isActive: true },
        { id: "reason-2", code: "OLD", name: "Old", isActive: false },
      ],
    });
    const repository = new ApiCashierRepository({
      get,
    } as unknown as HttpClient);

    const reasons = await repository.getDiscountReasons(true);

    expect(get).toHaveBeenCalledWith("/api/v1/discount-reasons", {
      params: { page: 1, limit: 100 },
    });
    expect(reasons.map((reason) => reason.id)).toEqual(["reason-1"]);
  });

  it("maps nested table and order ids on table sessions", async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: "session-1",
            tenantId: "tenant-1",
            table: { id: "table-1", tableNumber: "T-01" },
            guestCount: 2,
            openedAt: "2026-09-21T12:00:00.000Z",
            closedAt: null,
            salesOrder: { id: "order-1" },
            sessionState: "ORDERING",
          },
        ],
      },
    });
    const repository = new ApiCashierRepository({
      get,
    } as unknown as HttpClient);

    const sessions = await repository.getTableSessions({ page: 1, limit: 100 });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: "session-1",
      tableId: "table-1",
      salesOrderId: "order-1",
      sessionState: "ORDERING",
    });
  });

  it("keeps table status and closed sessions from being misread", async () => {
    const get = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("dining-tables")) {
        return Promise.resolve({
          data: {
            items: [
              { id: "table-free", tableNumber: "T1", status: "available" },
              { id: "table-busy", tableNumber: "T2", status: " occupied " },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          items: [
            {
              id: "session-closed",
              tableId: "table-free",
              openedAt: "2026-09-21T12:00:00.000Z",
              closedAt: "2026-09-21T13:00:00.000Z",
            },
          ],
        },
      });
    });
    const repository = new ApiCashierRepository({
      get,
    } as unknown as HttpClient);

    const tables = await repository.getDiningTables({ page: 1, limit: 200 });
    const sessions = await repository.getTableSessions({ page: 1, limit: 200 });

    expect(tables.map((table) => table.status)).toEqual(["AVAILABLE", "OCCUPIED"]);
    expect(sessions[0]?.sessionState).toBe("CLOSED");
  });

  it("lists and reads KDS tickets from the ticket endpoints", async () => {
    const get = vi.fn().mockImplementation((url: string) => {
      if (String(url).endsWith("/kds/tickets/ticket-1")) {
        return Promise.resolve({
          success: true,
          data: {
            id: "ticket-1",
            ticketNumber: "KDS-20260506-0001",
            status: "PENDING",
            courseType: "MAIN",
            stationId: "station-1",
            firedAt: "2026-09-22T16:53:22.241Z",
          },
        });
      }
      return Promise.resolve({
        success: true,
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
        data: [
          {
            id: "ticket-1",
            ticketNumber: "KDS-20260506-0001",
            status: "PREPARING",
            courseType: "MAIN",
            stationId: "station-1",
          },
        ],
      });
    });
    const repository = new ApiCashierRepository({
      get,
    } as unknown as HttpClient);

    const list = await repository.listKdsTickets({
      page: 1,
      limit: 50,
      activeOnly: true,
    });
    const ticket = await repository.getKdsTicketById("ticket-1");

    expect(get).toHaveBeenCalledWith("/api/v1/kds/tickets", {
      params: { page: 1, limit: 50, activeOnly: true },
    });
    expect(list.tickets[0]).toMatchObject({
      id: "ticket-1",
      status: "PREPARING",
      courseType: "MAIN",
    });
    expect(list.totalPages).toBe(1);
    expect(ticket.ticketNumber).toBe("KDS-20260506-0001");
  });
});
