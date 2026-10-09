import { describe, expect, it } from "vitest";
import { defaultPrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";
import { buildSaleReceiptLines } from "../formatKdsTicket";
import { shiftSlip } from "../shiftSlip";

const summary = {
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
};

const shiftTemplate = () => {
  const settings = defaultPrintTemplateSettings();
  settings.header = { logo: false, outletName: true, address: false, contact: false, email: false };
  settings.other.footerText = "";
  return settings;
};

const company = { name: "Grand Spa", address: "No. 12, Pyay Road", phone: "09 123" };

describe("the shift report slip", () => {
  it("asks for the shift template", () => {
    expect(shiftSlip(summary).templateType).toBe("SHIFT");
  });

  it("heads the report with the business name only, as its template starts", () => {
    const text = buildSaleReceiptLines({
      ...shiftSlip(summary),
      company,
      template: shiftTemplate(),
    }).join("\n");
    expect(text).toContain("GRAND SPA");
    expect(text).not.toContain("Pyay Road");
    expect(text).not.toContain("Tel 09 123");
  });

  it("follows its template: no business name, no cashier, no payments, a footer", () => {
    const template = shiftTemplate();
    template.header.outletName = false;
    template.other.cashier = false;
    template.bill.totalPayment = false;
    template.other.footerText = "Count the drawer";
    const text = buildSaleReceiptLines({
      ...shiftSlip(summary),
      company,
      template,
      currency: "MMK",
    }).join("\n");
    expect(text).not.toContain("GRAND SPA");
    expect(text).not.toContain("Ma Aye");
    expect(text).not.toMatch(/Cash \(3\)/);
    expect(text).toMatch(/NET\s+65,000 MMK/);
    expect(text).toContain("Count the drawer");
  });

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
