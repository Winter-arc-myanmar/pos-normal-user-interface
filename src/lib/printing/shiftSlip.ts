import type { ShiftSummary } from "@/core/domain/entities/Shift";
import { formatPrintDate, SaleReceipt } from "./formatKdsTicket";

/** A shift's report as the till's receipt printer prints it. */
export function shiftSlip(summary: ShiftSummary): SaleReceipt {
  return {
    title: "Shift report",
    place: "CHECKOUT",
    templateType: "SHIFT",
    paidAt: summary.closedAt || undefined,
    cashier: summary.cashierName || undefined,
    facts: [
      { label: "POS device", value: summary.registerName },
      { label: "Opened", value: formatPrintDate(summary.openedAt) },
      { label: "Closed", value: summary.closedAt ? formatPrintDate(summary.closedAt) : "Still open" },
      { label: "Sales", value: `${summary.salesCount} ${summary.salesCount === 1 ? "bill" : "bills"}` },
      ...(summary.refundCount
        ? [{ label: "Refunds", value: `${summary.refundCount} ${summary.refundCount === 1 ? "bill" : "bills"}` }]
        : []),
    ],
    lines: [],
    amounts: [
      { label: "Sales", amount: String(summary.totalSales) },
      { label: "Refunds", amount: String(-Math.abs(summary.totalRefunds)) },
    ],
    totalLabel: "NET",
    total: String(summary.netTotal),
    payments: summary.paymentBreakdown.map((row) => ({
      name: `${row.methodName} (${row.transactionCount})`,
      amount: String(row.totalAmount),
    })),
  };
}
