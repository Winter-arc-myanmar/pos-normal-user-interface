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
  /** A second, deliberate tap is what closes a shift. */
  const [confirmClose, setConfirmClose] = useState(false);
  /** Once it is closed, the till asks whether the report should print. */
  const [askPrint, setAskPrint] = useState(false);
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
      // The shift is counted and closed; now the till asks for its report.
      setAskPrint(true);
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

        {askPrint ? (
          <div
            role="alertdialog"
            aria-label={t("shift.askPrintTitle")}
            className="space-y-3 rounded-lg border border-amber-600/60 bg-amber-950/40 px-3 py-3 print:hidden"
          >
            <p className="text-sm font-semibold text-amber-100">
              {t("shift.askPrintTitle")}
            </p>
            <p className="text-xs text-amber-200/80">{t("shift.askPrintBody")}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAskPrint(false)}
                disabled={printing}
              >
                {t("shift.askPrintNo")}
              </Button>
              <Button
                type="button"
                disabled={printing}
                isLoading={printing}
                onClick={() => {
                  setAskPrint(false);
                  void print();
                }}
              >
                {t("shift.askPrintYes")}
              </Button>
            </div>
          </div>
        ) : confirmClose ? (
          <div
            role="alertdialog"
            aria-label={t("shift.confirmCloseTitle", { action: title })}
            className="space-y-3 rounded-lg border border-amber-600/60 bg-amber-950/40 px-3 py-3 print:hidden"
          >
            <p className="text-sm font-semibold text-amber-100">
              {t("shift.confirmCloseTitle", { action: title })}
            </p>
            <p className="text-xs text-amber-200/80">{t("shift.confirmCloseBody")}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmClose(false)}
                disabled={busy}
              >
                {t("shift.confirmBack")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                isLoading={busy}
                onClick={() => {
                  setConfirmClose(false);
                  void close();
                }}
              >
                {t("shift.confirmCloseYes", { action: title })}
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
                onClick={() => void print()}
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
              <Button type="button" variant="destructive" onClick={() => setConfirmClose(true)} disabled={busy}>
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
