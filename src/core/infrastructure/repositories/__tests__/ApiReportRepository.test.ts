import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../api/HttpClient";
import { ApiReportRepository } from "../ApiReportRepository";

describe("ApiReportRepository", () => {
  it("loads the sales summary with the documented query", async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({
        success: true,
        data: {
          from: "2026-09-01",
          to: "2026-09-14",
          locationIds: [],
          orders: { count: 1, averageNetSales: "1", averageGrandTotal: "1", voided: { count: 0, amount: "0" } },
          sales: {
            grossSales: "10",
            lineDiscounts: "0",
            orderDiscounts: "0",
            totalDiscounts: "0",
            netSales: "10",
            serviceCharge: "0",
            tax: "0",
            tips: "0",
            grandTotal: "10",
          },
          refunds: { count: 0, subtotal: "0", tax: "0", total: "0", byMethod: [] },
          netAfterRefunds: "10",
          voidedLines: { count: 0, amount: "0" },
          compedLines: { count: 0, amount: "0" },
          payments: { byMethod: [], tendered: "10", changeGiven: "0" },
          byDay: [],
          byHour: [],
          byOutlet: [],
          byServiceType: [],
        },
      }),
    };
    const repository = new ApiReportRepository(httpClient as unknown as HttpClient);
    const report = await repository.salesSummary({
      from: "2026-09-01",
      to: "2026-09-14",
      locationId: "location-1",
    });
    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/reports/sales-summary", {
      params: { from: "2026-09-01", to: "2026-09-14", locationId: "location-1" },
    });
    expect(report.sales.netSales).toBe("10");
  });
});
