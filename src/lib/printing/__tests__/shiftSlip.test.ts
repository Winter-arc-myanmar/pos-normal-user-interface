import { describe, expect, it } from "vitest";
import { buildSaleReceiptLines } from "../formatKdsTicket";
import { shiftSlip } from "../shiftSlip";

describe("the shift report slip", () => {
  it("prints the till, cashier, sales, refunds, net and each payment type", () => {
    const slip = shiftSlip({
      sessionId: "shift-1",
      registerName: "Front desk",
      cashierName: "Ma Aye",
      openedAt: "2026-10-07T08:00:00",
      closedAt: "2026-10-07T16:00:00",
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
      paymentBreakdown: [{ methodName: "Cash", transactionCount: 3, totalAmount: 40000 }],
    });
    const text = buildSaleReceiptLines({ ...slip, currency: "MMK" }).join("\n");

    expect(text).toContain("SHIFT REPORT");
    expect(text).toMatch(/POS device\s+Front desk/);
    expect(text).toMatch(/Cashier\s+Ma Aye/);
    expect(text).toMatch(/Opened\s+07 Oct 2026 08:00/);
    expect(text).toMatch(/Closed\s+07 Oct 2026 16:00/);
    expect(text).toMatch(/Sales\s+4 bills/);
    expect(text).toMatch(/Sales\s+70,000 MMK/);
    expect(text).toMatch(/Refunds\s+-5,000 MMK/);
    expect(text).toMatch(/NET\s+65,000 MMK/);
    expect(text).toMatch(/Cash \(3\)\s+40,000 MMK/);
    expect(text).not.toContain("Thank you!");
  });
});
