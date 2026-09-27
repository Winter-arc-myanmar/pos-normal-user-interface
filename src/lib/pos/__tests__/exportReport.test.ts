import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { SalesSummaryReport } from "@/core/domain/entities/Report";
import {
  downloadCsv,
  ReportExportLabels,
  salesSummarySheets,
  workbookFile,
} from "../exportReport";

describe("downloadCsv", () => {
  it("downloads a csv named for the report", () => {
    const click = vi.fn();
    const link = { href: "", download: "", click };
    vi.spyOn(document, "createElement").mockReturnValue(link as unknown as HTMLElement);
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();

    downloadCsv("payments-2026-09-01.csv", [
      ["Method", "Amount"],
      ["Cash", "10"],
    ]);

    expect(link.download).toBe("payments-2026-09-01.csv");
    expect(click).toHaveBeenCalled();
  });
});

const labels = {
  from: "From",
  to: "To",
  netSales: "Net sales",
  grossSales: "Gross sales",
  orders: "Orders",
  grandTotal: "Grand total",
  discounts: "Discounts",
  lineDiscounts: "Line discounts",
  orderDiscounts: "Order discounts",
  refunds: "Refunds",
  netAfterRefunds: "Net after refunds",
  serviceTypes: "Service types",
  byDay: "By day",
  byHour: "By hour",
  byOutlet: "By outlet",
  totals: "Totals",
  method: "Method",
  count: "Count",
  amount: "Amount",
  categories: "Category sales",
  items: "Item sales",
  payments: "Payments",
  tendered: "Tendered",
  changeGiven: "Change given",
  topItems: "Top items",
  shifts: "Shift report",
  completed: "Completed",
  voided: "Voided",
  refunded: "Refunded",
  summary: "Sales summary",
  metric: "Metric",
  value: "Value",
  date: "Date",
  hour: "Hour",
  outlet: "Outlet",
  share: "Share %",
  quantity: "Quantity",
  sku: "SKU",
  product: "Product",
  category: "Category",
  averagePrice: "Average price",
  serviceCharge: "Service charge",
  tips: "Tips",
  tax: "Tax",
  subtotal: "Subtotal",
  kind: "Kind",
  tip: "Tip",
  voidedOrders: "Voided orders",
  voidedAmount: "Voided amount",
  voidedLines: "Voided lines",
  compedLines: "Comped lines",
  compedAmount: "Comped amount",
  averageNetSales: "Average net sales",
  averageGrandTotal: "Average grand total",
  refundCount: "Refund count",
  refundSubtotal: "Refund subtotal",
  refundTax: "Refund tax",
  returned: "Returned",
  refundAmount: "Refund amount",
  netQuantity: "Net quantity",
} satisfies ReportExportLabels;

const summary = {
  from: "2026-09-01",
  to: "2026-09-02",
  locationIds: [],
  orders: {
    count: 2,
    averageNetSales: "750",
    averageGrandTotal: "800",
    voided: { count: 0, amount: "0" },
  },
  sales: {
    grossSales: "1600",
    lineDiscounts: "50",
    orderDiscounts: "50",
    totalDiscounts: "100",
    netSales: "1500",
    serviceCharge: "0",
    tax: "0",
    tips: "0",
    grandTotal: "1500",
  },
  refunds: { count: 0, subtotal: "0", tax: "0", total: "0", byMethod: [] },
  netAfterRefunds: "1500",
  voidedLines: { count: 0, amount: "0" },
  compedLines: { count: 0, amount: "0" },
  payments: { byMethod: [], tendered: "1500", changeGiven: "0" },
  byDay: [
    {
      businessDate: "2026-09-01",
      orderCount: 2,
      netSales: "1500",
      grandTotal: "1500",
      refunds: "0",
    },
  ],
  byHour: [],
  byOutlet: [],
  byServiceType: [
    { serviceType: "TAKEAWAY", orderCount: 2, netSales: "1500", grandTotal: "1500" },
  ],
} satisfies SalesSummaryReport;

describe("workbookFile", () => {
  it("writes an xlsx workbook with numeric money cells", () => {
    const book = XLSX.read(workbookFile(salesSummarySheets(labels, summary)), {
      type: "array",
      cellNF: true,
    });

    expect(book.SheetNames).toEqual([
      "Sales summary",
      "Service types",
      "By day",
      "By hour",
      "By outlet",
    ]);
    const netSales = book.Sheets["Sales summary"].B4;
    expect(netSales).toMatchObject({ t: "n", v: 1500, z: "#,##0.00" });
    const orders = book.Sheets["Sales summary"].B6;
    expect(orders).toMatchObject({ t: "n", v: 2, z: "#,##0" });
    const day = XLSX.utils.sheet_to_json<string[]>(book.Sheets["By day"], { header: 1 });
    expect(day[0]).toEqual(["Date", "Orders", "Net sales", "Grand total", "Refunds"]);
    expect(day[1]?.[0]).toBe("2026-09-01");
    expect(day[1]?.[2]).toBe(1500);
  });
});
