import { useTranslation } from "react-i18next";
import type { BillBreakdown } from "@/lib/pos/billBreakdown";
import { formatPosMoney } from "@/lib/pos/orderListDisplay";

const shown = (amount: number) => Math.abs(amount) >= 0.005;

/** The lines between a bill's subtotal and its total; rows that come to nothing are left out. */
export function BillBreakdownRows({ breakdown }: { breakdown: BillBreakdown }) {
  const { t } = useTranslation();
  const rows: { label: string; amount: number; tone?: "saving" | "note" }[] = [
    { label: t("cashier.breakdown.subtotal"), amount: breakdown.subtotal },
    {
      label: t(breakdown.priceChange < 0 ? "cashier.breakdown.priceDiscount" : "cashier.breakdown.priceChange"),
      amount: breakdown.priceChange,
      tone: breakdown.priceChange < 0 ? "saving" : undefined,
    },
    { label: t("cashier.breakdown.promotion"), amount: -breakdown.promotion, tone: "saving" },
    { label: t("cashier.breakdown.foc"), amount: -breakdown.foc, tone: "saving" },
    { label: t("cashier.breakdown.itemDiscount"), amount: -breakdown.itemDiscount, tone: "saving" },
    { label: t("cashier.breakdown.billDiscount"), amount: -breakdown.billDiscount, tone: "saving" },
    { label: t("cashier.breakdown.serviceCharge"), amount: breakdown.serviceCharge },
    { label: t("cashier.breakdown.tax"), amount: breakdown.tax },
    { label: t("cashier.breakdown.includedTax"), amount: breakdown.includedTax, tone: "note" },
    { label: t("cashier.breakdown.tip"), amount: breakdown.tip },
  ];
  return (
    <dl className="space-y-1 text-sm">
      {rows.map((row, index) =>
        index === 0 || shown(row.amount) ? (
          <div
            key={row.label}
            className={[
              "flex items-center justify-between gap-2",
              row.tone === "saving" ? "text-emerald-700" : row.tone === "note" ? "text-xs text-slate-400" : "text-slate-600",
            ].join(" ")}
          >
            <dt>{row.label}</dt>
            <dd className="tabular-nums">
              {index === 0 || row.tone === "note"
                ? formatPosMoney(row.amount)
                : `${row.amount < 0 ? "−" : "+"}${formatPosMoney(Math.abs(row.amount))}`}
            </dd>
          </div>
        ) : null
      )}
    </dl>
  );
}
