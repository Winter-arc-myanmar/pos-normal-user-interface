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

  it("loads POS summary, bills, bar, SPA, and KTV reports", async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({ success: true, data: { from: "2026-10-01" } }),
    };
    const repository = new ApiReportRepository(httpClient as unknown as HttpClient);

    await repository.posSummary({ posType: "SPA", from: "2026-10-01", to: "2026-10-04" });
    await repository.posBills({
      posType: "SPA",
      from: "2026-10-01",
      to: "2026-10-04",
      page: 1,
      limit: 50,
      search: "su",
    });
    await repository.barCategories({ from: "2026-10-01", to: "2026-10-04" });
    await repository.spaMenu({ from: "2026-10-01", to: "2026-10-04" });
    await repository.ktvSessions({ from: "2026-10-01", to: "2026-10-04" });

    expect(httpClient.get).toHaveBeenNthCalledWith(1, "/api/v1/reports/pos-summary", {
      params: { posType: "SPA", from: "2026-10-01", to: "2026-10-04" },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(2, "/api/v1/reports/pos-bills", {
      params: {
        posType: "SPA",
        from: "2026-10-01",
        to: "2026-10-04",
        page: 1,
        limit: 50,
        search: "su",
      },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(3, "/api/v1/reports/bar-categories", {
      params: { from: "2026-10-01", to: "2026-10-04" },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(4, "/api/v1/reports/spa-menu", {
      params: { from: "2026-10-01", to: "2026-10-04" },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(5, "/api/v1/reports/ktv-sessions", {
      params: { from: "2026-10-01", to: "2026-10-04" },
    });
  });
});
