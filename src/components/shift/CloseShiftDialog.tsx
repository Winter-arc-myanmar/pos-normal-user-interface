import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { ShiftSummary } from "@/core/domain/entities/Shift";
import { ShiftReport } from "./ShiftReport";
import { errorText, shiftApi } from "./shiftApi";
import { useShiftPrinter } from "./useShiftPrinter";

/** Ending a shift: what it sold so far, then closed, with the report ready to print. */
export function CloseShiftDialog({
  sessionId,
  title,
  onClosed,
  onCancel,
}: {
  sessionId: string;
  title: string;
  onClosed: (summary: ShiftSummary) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [report, setReport] = useState<ShiftSummary | null>(null);
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  /** A second, deliberate tap is what closes a shift or prints its report. */
  const [confirm, setConfirm] = useState<"close" | "print" | null>(null);
  const printShift = useShiftPrinter();

  useEffect(() => {
    let live = true;
    shiftApi()
      .summary(sessionId)
      .then((summary) => live && setReport(summary))
      .catch((caught) => live && setError(errorText(caught, t("cashier.errors.posSessionControl"))));
    return () => {
      live = false;
    };
  }, [sessionId, t]);

  const close = async () => {
    setBusy(true);
    setError(null);
    try {
      setReport(await shiftApi().close(sessionId));
      setClosed(true);
    } catch (caught) {
      setError(errorText(caught, t("cashier.errors.posSessionControl")));
    } finally {
      setBusy(false);
    }
  };

  const print = async () => {
    if (!report) return;
    setPrinting(true);
    setError(null);
    try {
      await printShift(report);
    } catch (caught) {
      setError(errorText(caught, t("receipt.printFailed")));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-8 print:static print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-full w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl print:border-0 print:shadow-none">
        <h2 className="text-xl font-bold text-white print:hidden">
          {closed ? t("shift.doneTitle") : title}
        </h2>

        {report ? (
          <ShiftReport summary={report} />
        ) : error ? null : (
          <p role="status" className="text-sm text-slate-400">
            {t("common.loading")}
          </p>
        )}

        {error ? (
          <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {confirm ? (
          <div
            role="alertdialog"
            aria-label={
              confirm === "close"
                ? t("shift.confirmCloseTitle", { action: title })
                : t("shift.confirmPrintTitle")
            }
            className="space-y-3 rounded-lg border border-amber-600/60 bg-amber-950/40 px-3 py-3 print:hidden"
          >
            <p className="text-sm font-semibold text-amber-100">
              {confirm === "close"
                ? t("shift.confirmCloseTitle", { action: title })
                : t("shift.confirmPrintTitle")}
            </p>
            <p className="text-xs text-amber-200/80">
              {confirm === "close"
                ? t("shift.confirmCloseBody")
                : t("shift.confirmPrintBody")}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirm(null)}
                disabled={busy || printing}
              >
                {t("shift.confirmBack")}
              </Button>
              <Button
                type="button"
                variant={confirm === "close" ? "destructive" : "primary"}
                disabled={busy || printing}
                isLoading={confirm === "close" ? busy : printing}
                onClick={() => {
                  const action = confirm;
                  setConfirm(null);
                  if (action === "close") void close();
                  else void print();
                }}
              >
                {confirm === "close"
                  ? t("shift.confirmCloseYes", { action: title })
                  : t("shift.confirmPrintYes")}
              </Button>
            </div>
          </div>
        ) : (
        <div className="flex flex-wrap justify-end gap-2 print:hidden">
          {closed && report ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirm("print")}
                disabled={printing}
                isLoading={printing}
              >
                {t("shift.print")}
              </Button>
              <Button type="button" onClick={() => onClosed(report)}>
                {t("shift.done")}
              </Button>
            </>
          ) : (
            <>
              {onCancel ? (
                <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                  {t("common.cancel")}
                </Button>
              ) : null}
              <Button type="button" variant="destructive" onClick={() => setConfirm("close")} disabled={busy}>
                {busy ? t("shift.closing") : title}
              </Button>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
