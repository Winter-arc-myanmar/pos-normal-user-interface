import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBillOptions } from "../useBillOptions";
import type { SalesOrderBillDTO } from "@/core/application/dtos/SalesOrderDTO";

const bill: SalesOrderBillDTO = {
  orderId: "order-1", subtotal: "100.0000", totalDiscount: "0.0000",
  addedTax: "5.0000", totalTax: "5.5000", serviceCharge: "10.0000",
  serviceChargeTax: "0.5000", grandTotal: "115.5000",
};

describe("useBillOptions", () => {
  it("keeps defaults and resets choices on a new bill", async () => {
    const fetchBill = vi.fn().mockResolvedValue(bill);
    const { result, rerender } = renderHook(({ billKey }) => useBillOptions({
      billKey, orderId: billKey, discount: "0", revision: "1", fetchBill,
    }), { initialProps: { billKey: "order-1" } });
    expect(result.current.includeTax).toBe(true);
    expect(result.current.includeServiceCharge).toBe(true);
    await waitFor(() => expect(result.current.quote).toEqual(bill));
    expect(result.current.bill).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(fetchBill).toHaveBeenCalledWith("order-1", {
      discount: "0", includeTax: true, includeServiceCharge: true,
    });
    act(() => result.current.choose("includeTax", false));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.bill).toEqual(bill));
    expect(fetchBill).toHaveBeenCalledWith("order-1", {
      discount: "0", includeTax: false, includeServiceCharge: true,
    });
    rerender({ billKey: "order-2" });
    expect(result.current.includeTax).toBe(true);
    expect(result.current.changed).toBe(false);
    expect(result.current.bill).toBeUndefined();
    rerender({ billKey: "order-1" });
    expect(result.current.includeTax).toBe(true);
    expect(result.current.changed).toBe(false);
    expect(result.current.bill).toBeUndefined();
  });

  it("ignores stale responses when options change rapidly", async () => {
    let resolveFirst!: (value: SalesOrderBillDTO) => void;
    let resolveSecond!: (value: SalesOrderBillDTO) => void;
    const fetchBill = vi.fn()
      .mockResolvedValueOnce(bill)
      .mockImplementationOnce(() => new Promise<SalesOrderBillDTO>((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<SalesOrderBillDTO>((resolve) => { resolveSecond = resolve; }));
    const { result } = renderHook(() => useBillOptions({
      billKey: "1", orderId: "order-1", discount: "0", revision: "1", fetchBill,
    }));
    act(() => result.current.choose("includeTax", false));
    act(() => result.current.choose("includeServiceCharge", false));
    await act(async () => resolveSecond({ ...bill, grandTotal: "100.0000" }));
    await act(async () => resolveFirst(bill));
    expect(result.current.bill?.grandTotal).toBe("100.0000");
  });

  it("requires a successful fresh quote after errors or discount changes", async () => {
    const fetchBill = vi.fn().mockResolvedValueOnce(bill).mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(bill);
    const { result, rerender } = renderHook(({ discount }) => useBillOptions({
      billKey: "1", orderId: "order-1", discount, revision: "1", fetchBill,
    }), { initialProps: { discount: "0" } });
    act(() => result.current.choose("includeTax", false));
    await waitFor(() => expect(result.current.error).toBe("Offline"));
    act(() => result.current.choose("includeTax", true));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.bill).toEqual(bill));
    rerender({ discount: "10" });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(fetchBill).toHaveBeenLastCalledWith("order-1", {
      discount: "10", includeTax: true, includeServiceCharge: true,
    }));
  });

  it("updates direct-cart options without an order request", () => {
    const fetchBill = vi.fn();
    const { result } = renderHook(() => useBillOptions({
      billKey: "direct", discount: "0", revision: "1", fetchBill,
    }));
    act(() => result.current.choose("includeTax", false));
    expect(result.current.includeTax).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(fetchBill).not.toHaveBeenCalled();
  });
});