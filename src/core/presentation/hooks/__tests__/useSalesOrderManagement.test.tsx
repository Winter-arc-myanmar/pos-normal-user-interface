import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SalesOrderBillDTO } from "../../../application/dtos/SalesOrderDTO";

const service = vi.hoisted(() => ({ getSalesOrderBill: vi.fn() }));

vi.mock("../../../infrastructure/di/container", () => ({
  default: { resolve: () => service },
}));

import { useSalesOrderManagement } from "../useSalesOrderManagement";

const bill: SalesOrderBillDTO = {
  orderId: "order-1",
  subtotal: "100.0000",
  totalDiscount: "10.0000",
  addedTax: "0.0000",
  totalTax: "0.0000",
  serviceCharge: "9.0000",
  serviceChargeTax: "0.0000",
  grandTotal: "99.0000",
};

describe("useSalesOrderManagement bill preview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes a stable callback and does not mutate shared state while fetching", async () => {
    let resolveBill!: (value: SalesOrderBillDTO) => void;
    service.getSalesOrderBill.mockImplementationOnce(
      () => new Promise<SalesOrderBillDTO>((resolve) => { resolveBill = resolve; })
    );
    const { result, rerender } = renderHook(() => useSalesOrderManagement());
    const initial = result.current;
    const query = { discount: "10", includeTax: false, includeServiceCharge: true };
    let request!: Promise<SalesOrderBillDTO>;

    act(() => { request = result.current.fetchOrderBill("order-1", query); });

    expect(service.getSalesOrderBill).toHaveBeenCalledWith("order-1", query);
    expect(result.current).toBe(initial);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveBill(bill);
      expect(await request).toBe(bill);
    });

    expect(result.current).toBe(initial);
    rerender();
    expect(result.current.fetchOrderBill).toBe(initial.fetchOrderBill);
  });

  it("propagates preview errors without changing shared loading, error or selection state", async () => {
    const error = new Error("Preview unavailable");
    service.getSalesOrderBill.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useSalesOrderManagement());
    const initial = result.current;

    await act(async () => {
      await expect(result.current.fetchOrderBill("order-1")).rejects.toBe(error);
    });

    expect(result.current).toBe(initial);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.selectedOrder).toBeNull();
    expect(service.getSalesOrderBill).toHaveBeenCalledWith("order-1", undefined);
  });
});