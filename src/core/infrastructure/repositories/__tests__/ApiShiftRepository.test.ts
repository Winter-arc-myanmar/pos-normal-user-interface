import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../api/HttpClient";
import { ApiShiftRepository } from "../ApiShiftRepository";

const summaryBody = {
  sessionId: "shift-1",
  registerName: "Front desk",
  cashierName: "Ma Aye",
  openedAt: "2026-10-07T08:00:00Z",
  closedAt: "2026-10-07T16:00:00Z",
  openingCashFloat: 0,
  expectedClosingCash: 0,
  actualClosingCash: null,
  cashVariance: null,
  totalSales: 70000,
  totalRefunds: 5000,
  netTotal: 65000,
  salesCount: 4,
  refundCount: 1,
  nonSalesCashIn: 0,
  nonSalesCashOut: 0,
  tipAmount: 3000,
  paymentBreakdown: [
    { methodName: "Cash", transactionCount: 3, totalAmount: 40000 },
  ],
};

describe("ApiShiftRepository", () => {
  it("reads the shift summary, including its tips", async () => {
    const get = vi.fn().mockResolvedValue({ success: true, data: summaryBody });
    const repository = new ApiShiftRepository({ get } as unknown as HttpClient);

    const summary = await repository.summary("shift-1");

    expect(summary).toMatchObject({
      sessionId: "shift-1",
      registerName: "Front desk",
      netTotal: 65000,
      tipAmount: 3000,
    });
  });

  it("takes the tips from a totals block when that is where the API puts them", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: { ...summaryBody, tipAmount: undefined, totals: { tipAmount: "2500.0000" } },
    });
    const repository = new ApiShiftRepository({ get } as unknown as HttpClient);

    const summary = await repository.summary("shift-1");

    expect(summary.tipAmount).toBe(2500);
  });
});
