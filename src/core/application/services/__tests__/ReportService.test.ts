import { describe, expect, it, vi } from "vitest";
import { ReportService } from "../ReportService";
import { IReportRepository } from "../../../domain/repositories/IReportRepository";
import { SalesSummaryReport } from "../../../domain/entities/Report";

const summary = (hours: SalesSummaryReport["byHour"]): SalesSummaryReport => ({
  from: "2026-10-01",
  to: "2026-10-04",
  locationIds: null,
  posType: "SPA",
  orders: {
    count: 1,
    averageNetSales: "1",
    averageGrandTotal: "1",
    voided: { count: 0, amount: "0" },
  },
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
  byHour: hours,
  byOutlet: [],
  byServiceType: [],
});

describe("ReportService POS reports", () => {
  it("rejects an unknown posType", async () => {
    const repository = { posSummary: vi.fn() } as unknown as IReportRepository;
    const service = new ReportService(repository);
    await expect(
      service.posSummary({
        posType: "DINING" as "SPA",
        from: "2026-10-01",
        to: "2026-10-04",
      })
    ).rejects.toThrow("posType must be SPA, KTV, or BAR");
    expect(repository.posSummary).not.toHaveBeenCalled();
  });

  it("pads POS summary hours to 24 rows", async () => {
    const repository = {
      posSummary: vi.fn().mockResolvedValue(
        summary([
          { hour: 14, orderCount: 8, netSales: "390000.0000", grandTotal: "390000.0000" },
        ])
      ),
    } as unknown as IReportRepository;
    const service = new ReportService(repository);
    const report = await service.posSummary({
      posType: "SPA",
      from: "2026-10-01",
      to: "2026-10-04",
    });
    expect(report.byHour).toHaveLength(24);
    expect(report.byHour[0]).toEqual({
      hour: 0,
      orderCount: 0,
      netSales: "0.0000",
      grandTotal: "0.0000",
    });
    expect(report.byHour[14].orderCount).toBe(8);
  });
});
