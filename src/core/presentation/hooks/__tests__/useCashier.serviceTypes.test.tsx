import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ServiceType } from "@/core/application/dtos/CashierDTO";

const mocks = vi.hoisted(() => ({
  createSalesOrder: vi.fn(),
  getSalesOrders: vi.fn(),
  getSalesOrderById: vi.fn(),
}));

vi.mock("@/core/infrastructure/di/container", () => ({
  default: {
    resolve: () => ({
      createSalesOrder: mocks.createSalesOrder,
      getSalesOrders: mocks.getSalesOrders,
      getSalesOrderById: mocks.getSalesOrderById,
      getSalesOrderLines: vi.fn().mockResolvedValue([]),
      getOrderPayments: vi.fn().mockResolvedValue([]),
    }),
  },
}));

import { useCashier } from "../useCashier";

/** What the API answers for a draft: it cannot hold the service type. */
const draftOrder = (id: string) => ({
  id,
  tenantId: "tenant-1",
  locationId: "branch-1",
  orderNumber: `POS-${id}`,
  salesChannel: "POS",
  serviceType: "DINE_IN",
  status: "DRAFT",
  subtotal: "0.0000",
  totalDiscount: "0.0000",
  totalTax: "0.0000",
  grandTotal: "0.0000",
  createdAt: "",
  updatedAt: "",
});

const createPayload = (serviceType: ServiceType) => ({
  tenantId: "tenant-1",
  locationId: "branch-1",
  salesChannel: "POS",
  serviceType,
  status: "DRAFT" as const,
  subtotal: "0.0000",
  totalDiscount: "0.0000",
  totalTax: "0.0000",
  grandTotal: "0.0000",
  idempotencyKey: "key-1",
});

describe("useCashier service types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.createSalesOrder.mockResolvedValue(draftOrder("order-1"));
    mocks.getSalesOrders.mockResolvedValue([draftOrder("order-1")]);
    mocks.getSalesOrderById.mockResolvedValue(draftOrder("order-1"));
  });

  it("keeps a pick-up order a pick-up after the list is refreshed", async () => {
    const { result } = renderHook(() => useCashier());

    await act(async () => {
      await result.current.createOrder(createPayload("PICK_UP"));
    });

    // The draft is still a pick-up, even though the API answered DINE_IN.
    expect(result.current.selectedOrder?.serviceType).toBe("PICK_UP");
    expect(result.current.salesOrders[0].serviceType).toBe("PICK_UP");

    await act(async () => {
      await result.current.fetchSalesOrders({ page: 1, limit: 100 });
    });

    expect(result.current.salesOrders[0].serviceType).toBe("PICK_UP");
  });

  it("keeps the opened type when the order is read back to pay it", async () => {
    const { result } = renderHook(() => useCashier());

    await act(async () => {
      await result.current.createOrder(createPayload("PICK_UP"));
    });

    let reloaded: Awaited<ReturnType<typeof result.current.selectOrderById>> | undefined;
    await act(async () => {
      reloaded = await result.current.selectOrderById("order-1");
    });

    await waitFor(() => expect(result.current.selectedOrder?.id).toBe("order-1"));
    expect(reloaded?.serviceType).toBe("PICK_UP");
    expect(result.current.selectedOrder?.serviceType).toBe("PICK_UP");
  });

  it("keeps a take-away a take-away, and leaves other tills' orders alone", async () => {
    const { result } = renderHook(() => useCashier());

    await act(async () => {
      await result.current.createOrder(createPayload("TAKE_AWAY"));
    });
    expect(result.current.salesOrders[0].serviceType).toBe("TAKE_AWAY");

    // An order this till never opened keeps the type the API reports.
    mocks.getSalesOrders.mockResolvedValue([draftOrder("order-9")]);
    await act(async () => {
      await result.current.fetchSalesOrders({ page: 1, limit: 100 });
    });

    expect(result.current.salesOrders).toHaveLength(1);
    expect(result.current.salesOrders[0].serviceType).toBe("DINE_IN");
  });

  it("keeps pick-up orders on the Pick Up tab after a reload", async () => {
    const first = renderHook(() => useCashier());

    await act(async () => {
      await first.result.current.createOrder(createPayload("PICK_UP"));
    });
    first.unmount();

    // A reload starts a new hook instance with the same device storage.
    const second = renderHook(() => useCashier());
    await act(async () => {
      await second.result.current.fetchSalesOrders({ page: 1, limit: 100 });
    });

    expect(second.result.current.salesOrders[0].serviceType).toBe("PICK_UP");
  });

  it("keeps one dine-in and two pick-ups counted correctly after a reload", async () => {
    let nextId = 1;
    mocks.createSalesOrder.mockImplementation(async () =>
      draftOrder(`order-${nextId++}`)
    );
    const first = renderHook(() => useCashier());

    await act(async () => {
      await first.result.current.createOrder(createPayload("DINE_IN"));
      await first.result.current.createOrder(createPayload("PICK_UP"));
      await first.result.current.createOrder(createPayload("PICK_UP"));
    });
    first.unmount();

    // The API answers DINE_IN for every draft, as it does in production.
    mocks.getSalesOrders.mockResolvedValue([
      draftOrder("order-1"),
      draftOrder("order-2"),
      draftOrder("order-3"),
    ]);
    const second = renderHook(() => useCashier());
    await act(async () => {
      await second.result.current.fetchSalesOrders({ page: 1, limit: 100 });
    });

    expect(
      second.result.current.salesOrders.map((order) => order.serviceType)
    ).toEqual(["DINE_IN", "PICK_UP", "PICK_UP"]);
  });
});
