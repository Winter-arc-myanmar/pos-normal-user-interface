import { useTranslation } from "react-i18next";
import type { ShiftSummary } from "@/core/domain/entities/Shift";
import { money } from "./shiftApi";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

export function Difference({ value }: { value: number | null }) {
  const { t } = useTranslation();
  if (value == null) return <span>—</span>;
  if (value === 0) return <span className="text-emerald-400">{t("shift.exact")}</span>;
  return (
    <span className={value < 0 ? "text-red-400" : "text-amber-400"}>
      {t(value < 0 ? "shift.short" : "shift.over", { amount: money(Math.abs(value)) })}
    </span>
  );
}

/** What a shift took and what its drawer came to; printable as it is. */
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
    ...summary.paymentBreakdown.map(
      (row): [string, React.ReactNode] => [`  ${row.methodName}`, money(row.totalAmount)]
    ),
    [t("shift.float"), money(summary.openingCashFloat)],
    [t("shift.cashIn"), money(summary.nonSalesCashIn)],
    [t("shift.cashOut"), money(summary.nonSalesCashOut)],
    [t("shift.expected"), money(summary.expectedClosingCash)],
    [t("shift.counted"), summary.actualClosingCash == null ? "—" : money(summary.actualClosingCash)],
    [t("shift.difference"), <Difference key="d" value={summary.cashVariance} />],
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
    </div>
  );
}
