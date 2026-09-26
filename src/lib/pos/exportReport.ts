import * as XLSX from "xlsx";
import {
  ItemSalesReport,
  SalesSummaryReport,
  ZReport,
} from "@/core/domain/entities/Report";

export function downloadCsv(filename: string, rows: string[][]) {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type ExcelFormat = "money" | "integer" | "quantity";

export type ExcelCell =
  | string
  | number
  | { value: number; format: ExcelFormat }
  | null
  | undefined;

export interface ExcelSheet {
  name: string;
  rows: ExcelCell[][];
}

export interface ReportExportLabels {
  from: string;
  to: string;
  netSales: string;
  grossSales: string;
  orders: string;
  grandTotal: string;
  discounts: string;
  lineDiscounts: string;
  orderDiscounts: string;
  refunds: string;
  netAfterRefunds: string;
  serviceTypes: string;
  byDay: string;
  byHour: string;
  byOutlet: string;
  totals: string;
  method: string;
  count: string;
  amount: string;
  categories: string;
  items: string;
  payments: string;
  tendered: string;
  changeGiven: string;
  topItems: string;
  shifts: string;
  completed: string;
  voided: string;
  refunded: string;
  summary: string;
  metric: string;
  value: string;
  date: string;
  hour: string;
  outlet: string;
  share: string;
  quantity: string;
  sku: string;
  product: string;
  category: string;
  averagePrice: string;
  serviceCharge: string;
  tips: string;
  tax: string;
  subtotal: string;
  kind: string;
  tip: string;
  voidedOrders: string;
  voidedAmount: string;
  voidedLines: string;
  compedLines: string;
  compedAmount: string;
  averageNetSales: string;
  averageGrandTotal: string;
  refundCount: string;
  refundSubtotal: string;
  refundTax: string;
  returned: string;
  refundAmount: string;
  netQuantity: string;
}

const FORMAT: Record<ExcelFormat, string> = {
  money: "#,##0.00",
  integer: "#,##0",
  quantity: "#,##0.###",
};

const INVALID_SHEET = /[\\/*?:[\]]/g;

export const excelMoney = (value?: string | number): ExcelCell => ({
  value: Number(value) || 0,
  format: "money",
});

export const excelCount = (value?: string | number): ExcelCell => ({
  value: Math.trunc(Number(value) || 0),
  format: "integer",
});

export const excelQuantity = (value?: string | number): ExcelCell => ({
  value: Number(value) || 0,
  format: "quantity",
});

const rawCell = (cell: ExcelCell): string | number => {
  if (cell && typeof cell === "object") return cell.value;
  if (cell === null || cell === undefined) return "";
  return cell;
};

const uniqueSheetName = (name: string, used: Set<string>) => {
  const cleaned = name.replace(INVALID_SHEET, " ").replace(/\s+/g, " ").trim();
  const base = (cleaned || "Sheet").slice(0, 31);
  let next = base;
  let index = 2;
  while (used.has(next)) {
    const suffix = ` ${index}`;
    next = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  used.add(next);
  return next;
};

export function buildWorkbook(sheets: ExcelSheet[]) {
  const book = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const sheet of sheets) {
    const rows = sheet.rows.length ? sheet.rows : [[""]];
    const worksheet = XLSX.utils.aoa_to_sheet(rows.map((row) => row.map(rawCell)));
    const width = rows.reduce((max, row) => Math.max(max, row.length), 1);
    worksheet["!cols"] = Array.from({ length: width }, (_, column) => {
      const longest = rows.reduce((max, row) => {
        const value = rawCell(row[column]);
        return Math.max(max, String(value).length);
      }, 12);
      return { wch: Math.min(36, Math.max(12, longest + 2)) };
    });
    if (rows.length > 0 && width > 0) {
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: Math.max(rows.length - 1, 0), c: width - 1 },
        }),
      };
      worksheet["!views"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2", activeCell: "A2" }];
    }
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        if (!cell || typeof cell !== "object") return;
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const written = worksheet[address];
        if (written) written.z = FORMAT[cell.format];
      });
    });
    XLSX.utils.book_append_sheet(book, worksheet, uniqueSheetName(sheet.name, used));
  }
  return book;
}

export function workbookFile(sheets: ExcelSheet[]): Uint8Array {
  return XLSX.write(buildWorkbook(sheets), {
    bookType: "xlsx",
    type: "array",
  }) as Uint8Array;
}

export function downloadExcel(filename: string, sheets: ExcelSheet[]) {
  const safeName = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(buildWorkbook(sheets), safeName);
}

const metrics = (
  name: string,
  labels: Pick<ReportExportLabels, "metric" | "value">,
  rows: ExcelCell[][]
): ExcelSheet => ({
  name,
  rows: [[labels.metric, labels.value], ...rows],
});

export function salesSummarySheets(
  labels: ReportExportLabels,
  summary: SalesSummaryReport
): ExcelSheet[] {
  return [
    metrics(labels.summary, labels, [
      [labels.from, summary.from],
      [labels.to, summary.to],
      [labels.netSales, excelMoney(summary.sales.netSales)],
      [labels.grossSales, excelMoney(summary.sales.grossSales)],
      [labels.orders, excelCount(summary.orders.count)],
      [labels.grandTotal, excelMoney(summary.sales.grandTotal)],
      [labels.discounts, excelMoney(summary.sales.totalDiscounts)],
      [labels.lineDiscounts, excelMoney(summary.sales.lineDiscounts)],
      [labels.orderDiscounts, excelMoney(summary.sales.orderDiscounts)],
      [labels.serviceCharge, excelMoney(summary.sales.serviceCharge)],
      [labels.tax, excelMoney(summary.sales.tax)],
      [labels.tips, excelMoney(summary.sales.tips)],
      [labels.averageNetSales, excelMoney(summary.orders.averageNetSales)],
      [labels.averageGrandTotal, excelMoney(summary.orders.averageGrandTotal)],
      [labels.refundCount, excelCount(summary.refunds.count)],
      [labels.refundSubtotal, excelMoney(summary.refunds.subtotal)],
      [labels.refundTax, excelMoney(summary.refunds.tax)],
      [labels.refunds, excelMoney(summary.refunds.total)],
      [labels.netAfterRefunds, excelMoney(summary.netAfterRefunds)],
      [labels.voidedOrders, excelCount(summary.orders.voided.count)],
      [labels.voidedAmount, excelMoney(summary.orders.voided.amount)],
      [labels.voidedLines, excelCount(summary.voidedLines.count)],
      [labels.compedLines, excelCount(summary.compedLines.count)],
      [labels.compedAmount, excelMoney(summary.compedLines.amount)],
      [labels.tendered, excelMoney(summary.payments.tendered)],
      [labels.changeGiven, excelMoney(summary.payments.changeGiven)],
    ]),
    {
      name: labels.serviceTypes,
      rows: [
        [labels.serviceTypes, labels.orders, labels.netSales, labels.grandTotal],
        ...summary.byServiceType.map((row) => [
          row.serviceType,
          excelCount(row.orderCount),
          excelMoney(row.netSales),
          excelMoney(row.grandTotal),
        ]),
      ],
    },
    {
      name: labels.byDay,
      rows: [
        [labels.date, labels.orders, labels.netSales, labels.grandTotal, labels.refunds],
        ...summary.byDay.map((row) => [
          row.businessDate,
          excelCount(row.orderCount),
          excelMoney(row.netSales),
          excelMoney(row.grandTotal),
          excelMoney(row.refunds),
        ]),
      ],
    },
    {
      name: labels.byHour,
      rows: [
        [labels.hour, labels.orders, labels.netSales, labels.grandTotal],
        ...summary.byHour.map((row) => [
          `${String(row.hour).padStart(2, "0")}:00`,
          excelCount(row.orderCount),
          excelMoney(row.netSales),
          excelMoney(row.grandTotal),
        ]),
      ],
    },
    {
      name: labels.byOutlet,
      rows: [
        [labels.outlet, labels.orders, labels.netSales, labels.grandTotal],
        ...summary.byOutlet.map((row) => [
          row.locationName || row.locationId,
          excelCount(row.orderCount),
          excelMoney(row.netSales),
          excelMoney(row.grandTotal),
        ]),
      ],
    },
  ];
}

export function paymentSheets(
  labels: ReportExportLabels,
  summary: SalesSummaryReport
): ExcelSheet[] {
  return [
    metrics(labels.payments, labels, [
      [labels.from, summary.from],
      [labels.to, summary.to],
      [labels.tendered, excelMoney(summary.payments.tendered)],
      [labels.changeGiven, excelMoney(summary.payments.changeGiven)],
    ]),
    {
      name: labels.method,
      rows: [
        [labels.method, labels.kind, labels.count, labels.amount],
        ...summary.payments.byMethod.map((row) => [
          row.name,
          row.kind,
          excelCount(row.count),
          excelMoney(row.amount),
        ]),
      ],
    },
    {
      name: labels.refunds,
      rows: [
        [labels.method, labels.count, labels.amount],
        ...summary.refunds.byMethod.map((row) => [
          row.refundMethod,
          excelCount(row.count),
          excelMoney(row.amount),
        ]),
      ],
    },
  ];
}

export function itemSalesSheets(
  labels: ReportExportLabels,
  items: ItemSalesReport | null
): ExcelSheet[] {
  const totals = items?.totals;
  return [
    metrics(labels.totals, labels, [
      [labels.from, items?.from || ""],
      [labels.to, items?.to || ""],
      [labels.quantity, excelQuantity(totals?.quantitySold)],
      [labels.grossSales, excelMoney(totals?.grossSales)],
      [labels.lineDiscounts, excelMoney(totals?.lineDiscounts)],
      [labels.orderDiscounts, excelMoney(totals?.orderDiscounts)],
      [labels.netSales, excelMoney(totals?.netSales)],
      [labels.returned, excelQuantity(totals?.quantityReturned)],
      [labels.refundAmount, excelMoney(totals?.refundAmount)],
      [labels.netAfterRefunds, excelMoney(totals?.netAfterRefunds)],
      [labels.voided, excelQuantity(totals?.quantityVoided)],
      [labels.voidedAmount, excelMoney(totals?.voidedValue)],
      [labels.compedLines, excelQuantity(totals?.quantityComped)],
      [labels.compedAmount, excelMoney(totals?.compedValue)],
    ]),
    {
      name: labels.categories,
      rows: [
        [
          labels.category,
          labels.orders,
          labels.quantity,
          labels.netSales,
          labels.share,
          labels.refundAmount,
        ],
        ...(items?.categories || []).map((row) => [
          row.categoryName,
          excelCount(row.orderCount),
          excelQuantity(row.quantitySold),
          excelMoney(row.netSales),
          excelQuantity(row.shareOfNetSales),
          excelMoney(row.refundAmount),
        ]),
      ],
    },
    {
      name: labels.items,
      rows: [
        [
          labels.product,
          labels.sku,
          labels.category,
          labels.orders,
          labels.quantity,
          labels.averagePrice,
          labels.grossSales,
          labels.discounts,
          labels.netSales,
          labels.share,
          labels.returned,
          labels.refundAmount,
          labels.netQuantity,
          labels.netAfterRefunds,
        ],
        ...(items?.items || []).map((row) => [
          row.productName,
          row.variantSku,
          row.categoryName,
          excelCount(row.orderCount),
          excelQuantity(row.quantitySold),
          excelMoney(row.averagePrice),
          excelMoney(row.grossSales),
          excelMoney(Number(row.lineDiscounts) + Number(row.orderDiscounts)),
          excelMoney(row.netSales),
          excelQuantity(row.shareOfNetSales),
          excelQuantity(row.quantityReturned),
          excelMoney(row.refundAmount),
          excelQuantity(row.netQuantity),
          excelMoney(row.netAfterRefunds),
        ]),
      ],
    },
  ];
}

export function shiftSheets(labels: ReportExportLabels, shift: ZReport): ExcelSheet[] {
  return [
    metrics(labels.shifts, labels, [
      [labels.date, shift.date],
      [labels.completed, excelCount(shift.orders.completed)],
      [labels.voided, excelCount(shift.orders.voided)],
      [labels.refunded, excelCount(shift.orders.refunded)],
      [labels.subtotal, excelMoney(shift.totals.subtotal)],
      [labels.discounts, excelMoney(shift.totals.totalDiscount)],
      [labels.tax, excelMoney(shift.totals.totalTax)],
      [labels.tips, excelMoney(shift.totals.tipAmount)],
      [labels.serviceCharge, excelMoney(shift.totals.serviceCharge)],
      [labels.grandTotal, excelMoney(shift.totals.grandTotal)],
    ]),
    {
      name: labels.payments,
      rows: [
        [labels.method, labels.amount, labels.tip],
        ...shift.payments.map((row) => [
          row.method,
          excelMoney(row.total),
          excelMoney(row.tip),
        ]),
      ],
    },
    {
      name: labels.categories,
      rows: [
        [labels.category, labels.orders, labels.amount],
        ...shift.byCategory.map((row) => [
          row.categoryName,
          excelCount(row.orderCount),
          excelMoney(row.totalRevenue),
        ]),
      ],
    },
    {
      name: labels.topItems,
      rows: [
        [labels.product, labels.sku, labels.quantity, labels.amount],
        ...shift.topItems.map((row) => [
          row.productName,
          row.variantSku,
          excelQuantity(row.quantitySold),
          excelMoney(row.totalRevenue),
        ]),
      ],
    },
  ];
}
