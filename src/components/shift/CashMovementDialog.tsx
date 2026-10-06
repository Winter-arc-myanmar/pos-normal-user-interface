import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { CashMovementKind } from "@/core/domain/entities/Shift";
import { errorText, shiftApi } from "./shiftApi";

const KINDS: { kind: CashMovementKind; label: string }[] = [
  { kind: "PAID_IN", label: "shift.cashIn" },
  { kind: "PAID_OUT", label: "shift.cashOut" },
  { kind: "DROP", label: "shift.drop" },
];

const field =
  "min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-amber-500";

/** Money in or out of the drawer that is not a sale: change brought in, petty cash, a safe drop. */
export function CashMovementDialog({
  posSessionId,
  locationId,
  cashMethodId,
  onDone,
  onCancel,
}: {
  posSessionId: string;
  locationId: string;
  cashMethodId: string | undefined;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<CashMovementKind>("PAID_OUT");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount);
  const save = async () => {
    if (!cashMethodId) return;
    setBusy(true);
    setError(null);
    try {
      await shiftApi().recordCash({
        posSessionId,
        locationId,
        paymentMethodId: cashMethodId,
        kind,
        amount: value,
        notes: notes.trim() || undefined,
      });
      onDone();
    } catch (caught) {
      setError(errorText(caught, t("cashier.errors.posSessionControl")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={t("shift.cashMoves")}
    >
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white">{t("shift.cashMoves")}</h2>
        <div role="radiogroup" className="grid grid-cols-3 gap-2">
          {KINDS.map((option) => (
            <button
              key={option.kind}
              type="button"
              role="radio"
              aria-checked={kind === option.kind}
              onClick={() => setKind(option.kind)}
              className={`min-h-11 rounded-lg border px-2 text-sm font-medium ${
                kind === option.kind
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-slate-700 text-slate-300 hover:bg-white/5"
              }`}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          aria-label={t("shift.amount")}
          placeholder={t("shift.amount")}
          className={`${field} text-lg tabular-nums`}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <input
          aria-label={t("shift.note")}
          placeholder={t("shift.note")}
          className={field}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        {!cashMethodId ? <p className="text-sm text-amber-300">{t("shift.noCashMethod")}</p> : null}
        {error ? (
          <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={busy || !cashMethodId || !(value > 0)}
            isLoading={busy}
          >
            {t("shift.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
