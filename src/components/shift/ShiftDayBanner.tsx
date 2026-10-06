import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { dayStatus } from "@/lib/pos/cashCount";
import { CloseShiftDialog } from "./CloseShiftDialog";

const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { timeStyle: "short" });

/**
 * A room board's day: a warning in its last hour, and once it is over a screen that
 * stops selling until the day is counted and closed - the server refuses the money
 * by then anyway, so this says why before a sale fails.
 */
export function ShiftDayBanner() {
  const { t } = useTranslation();
  const { currentShift, activePosSessionId, shiftClosed } = usePosWorkspace();
  const [now, setNow] = useState(() => Date.now());
  const [closing, setClosing] = useState(false);

  const dueAt = activePosSessionId ? (currentShift?.dueAt ?? null) : null;
  useEffect(() => {
    if (!dueAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [dueAt]);

  const status = dayStatus(dueAt, now);
  if (status === "none" || status === "ok" || !dueAt) return null;

  const closeDialog = closing ? (
    <CloseShiftDialog
      sessionId={activePosSessionId}
      title={t("shift.closeDay")}
      onCancel={() => setClosing(false)}
      onClosed={() => {
        setClosing(false);
        void shiftClosed();
      }}
    />
  ) : null;

  if (status === "ending") {
    return (
      <>
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-black print:hidden"
        >
          <span>{t("shift.dayEnding", { time: clock(dueAt) })}</span>
          <button type="button" className="rounded-md bg-black/80 px-3 py-1 text-white" onClick={() => setClosing(true)}>
            {t("shift.closeDay")}
          </button>
        </div>
        {closeDialog}
      </>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={t("shift.dayOver")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 print:hidden"
    >
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-red-900/60 bg-slate-900 p-6 text-center">
        <h2 className="text-xl font-bold text-white">{t("shift.dayOver")}</h2>
        <p className="text-sm text-slate-300">{t("shift.dayOverHint")}</p>
        <Button type="button" variant="destructive" onClick={() => setClosing(true)}>
          {t("shift.closeDay")}
        </Button>
      </div>
      {closeDialog}
    </div>
  );
}
