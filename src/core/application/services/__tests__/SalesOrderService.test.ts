import { describe, expect, it, vi } from "vitest";
import type { ISalesOrderRepository } from "../../../domain/repositories/ISalesOrderRepository";
import { SalesOrderService } from "../SalesOrderService";

describe("SalesOrderService bill preview", () => {
  it("delegates the preview query and returns the repository result unchanged", async () => {
    const bill = {
      orderId: "order-1",
      subtotal: "100.0000",
      totalDiscount: "10.0000",
      addedTax: "0.0000",
      totalTax: "0.0000",
      serviceCharge: "9.0000",
      serviceChargeTax: "0.0000",
      grandTotal: "99.0000",
    };
    const getSalesOrderBill = vi.fn().mockResolvedValue(bill);
    const service = new SalesOrderService({
      getSalesOrderBill,
    } as unknown as ISalesOrderRepository);
    const query = { discount: "10", includeTax: false, includeServiceCharge: true };

    expect(await service.getSalesOrderBill("order-1", query)).toBe(bill);
    expect(getSalesOrderBill).toHaveBeenCalledWith("order-1", query);
  });

  it("leaves omitted query values to backend defaults", async () => {
    const getSalesOrderBill = vi.fn().mockResolvedValue({});
    const service = new SalesOrderService({
      getSalesOrderBill,
    } as unknown as ISalesOrderRepository);

    await service.getSalesOrderBill("order-1");

    expect(getSalesOrderBill).toHaveBeenCalledWith("order-1", undefined);
  });

  it("rejects an empty order ID before requesting a preview", async () => {
    const getSalesOrderBill = vi.fn();
    const service = new SalesOrderService({
      getSalesOrderBill,
    } as unknown as ISalesOrderRepository);

    await expect(service.getSalesOrderBill("  ")).rejects.toThrow("Sales order ID is required");
    expect(getSalesOrderBill).not.toHaveBeenCalled();
  });

  it("propagates backend errors without replacing them", async () => {
    const error = new Error("Order not found");
    const service = new SalesOrderService({
      getSalesOrderBill: vi.fn().mockRejectedValue(error),
    } as unknown as ISalesOrderRepository);

    await expect(service.getSalesOrderBill("missing")).rejects.toBe(error);
  });
});