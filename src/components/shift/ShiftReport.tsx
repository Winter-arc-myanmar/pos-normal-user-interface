import { useTranslation } from "react-i18next";
import type { ShiftSummary } from "@/core/domain/entities/Shift";
import { money } from "./shiftApi";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

/** What a shift sold and who ran it; printable as it is. */
export function ShiftReport({ summary }: { summary: ShiftSummary }) {
  const { t } = useTranslation();
  const rows: [string, React.ReactNode][] = [
    [t("shift.till"), summary.registerName],
    [t("shift.cashier"), summary.cashierName ?? "—"],
    [t("shift.opened"), when(summary.openedAt)],
    [t("shift.closed"), when(summary.closedAt)],
    [t("shift.sales"), `${money(summary.totalSales)} (${summary.salesCount})`],
    [t("shift.refunds"), `${money(summary.totalRefunds)} (${summary.refundCount})`],
    [t("shift.net"), money(summary.netTotal)],
  ];
  return (
    <div className="shift-report rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm">
      <h3 className="mb-3 text-center font-semibold text-white">{t("shift.report")}</h3>
      <dl className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="whitespace-pre text-slate-400">{label}</dt>
            <dd className="text-right tabular-nums text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>
      <h4 className="mb-1 mt-4 font-medium text-slate-300">{t("shift.byPayment")}</h4>
      {summary.paymentBreakdown.length ? (
        <dl className="space-y-1">
          {summary.paymentBreakdown.map((row) => (
            <div key={row.methodName} className="flex justify-between gap-4">
              <dt className="text-slate-400">
                {row.methodName} <span className="text-slate-500">({row.transactionCount})</span>
              </dt>
              <dd className="text-right tabular-nums text-slate-100">{money(row.totalAmount)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-slate-500">—</p>
      )}
    </div>
  );
}
