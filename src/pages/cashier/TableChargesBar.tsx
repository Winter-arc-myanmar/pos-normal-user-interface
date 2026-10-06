import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TableChargeOffer, TableCharges } from "@/core/domain/entities/TableCharge";

const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const elapsed = (startedAt: string, now: number) => {
  const minutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

/**
 * A table's own charges above the menu: fees and time to add (+), and clocks to
 * start or stop - a pool table while guests play. Automatic ones are added when
 * the table opens, so only their running clocks show here.
 */
export function TableChargesBar({
  charges,
  isBusy,
  error,
  onAdd,
  onStop,
}: {
  charges: TableCharges;
  isBusy: boolean;
  error: string | null;
  onAdd: (charge: TableChargeOffer) => void;
  onStop: (variantId: string) => void;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const running = new Set(charges.running.map((clock) => clock.variantId));
  const optional = charges.offered.filter((charge) => !charge.autoApply);

  useEffect(() => {
    if (!charges.running.length) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [charges.running.length]);

  if (!optional.length && !charges.running.length) return null;

  const unit = (charge: TableChargeOffer) =>
    charge.soldBy === "TIME"
      ? ` / ${t("cashier.tableCharges.minutes", { count: charge.timeBlockMinutes ?? 60 })}`
      : "";

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-slate-700 bg-slate-950 p-2 text-sm">
      <span className="font-semibold text-slate-300">{t("cashier.tableCharges.title")}</span>
      {charges.running.map((clock) => (
        <span
          key={clock.variantId}
          className="inline-flex items-center gap-2 rounded border border-sky-700 bg-sky-950/40 px-2 py-1"
        >
          ⏱ {clock.name} {elapsed(clock.startedAt, now)}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onStop(clock.variantId)}
            className="rounded bg-sky-800 px-2 py-0.5 text-xs disabled:opacity-50"
          >
            {t("cashier.tableCharges.stop")}
          </button>
        </span>
      ))}
      {optional
        .filter((charge) => !running.has(charge.variantId))
        .map((charge) => (
          <button
            key={charge.variantId}
            type="button"
            disabled={isBusy}
            onClick={() => onAdd(charge)}
            className="rounded border border-slate-600 px-2 py-1 hover:border-emerald-500 disabled:opacity-50"
          >
            {charge.chargeMode === "CLOCK" ? `▶ ${t("cashier.tableCharges.start")} ` : "+ "}
            {charge.name} · {money(charge.unitPrice)}
            {unit(charge)}
          </button>
        ))}
      {error ? (
        <span role="alert" className="text-red-300">
          {error}
        </span>
      ) : null}
    </div>
  );
}
