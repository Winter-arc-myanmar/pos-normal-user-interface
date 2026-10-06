import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { ShiftSummary } from "@/core/domain/entities/Shift";
import { cashDifference } from "@/lib/pos/cashCount";
import { CashCounter } from "./CashCounter";
import { ManagerApprovalFields } from "./ManagerApprovalFields";
import {
  EMPTY_MANAGER_LOGIN,
  managerLoginFilled,
  type ManagerLogin,
} from "@/lib/pos/managerLogin";
import { Difference, ShiftReport } from "./ShiftReport";
import { errorText, money, shiftApi } from "./shiftApi";

export const VARIANCE_PERMISSION = "pos:cash-variance:approve";

type Step = "count" | "review" | "done";

/**
 * Ending a shift: the drawer is counted blind, then set against what it should
 * hold. A difference needs a manager's own login on this till. The report shows
 * at the end, ready to print.
 */
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
  const [step, setStep] = useState<Step>("count");
  const [counted, setCounted] = useState<number | null>(null);
  const [expected, setExpected] = useState<ShiftSummary | null>(null);
  const [manager, setManager] = useState<ManagerLogin>(EMPTY_MANAGER_LOGIN);
  const [closed, setClosed] = useState<ShiftSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const difference =
    expected && counted != null ? cashDifference(counted, expected.expectedClosingCash) : null;
  const needsApproval = difference != null && difference !== 0;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (caught) {
      setError(errorText(caught, t("cashier.errors.posSessionControl")));
    } finally {
      setBusy(false);
    }
  };

  const review = () =>
    run(async () => {
      setExpected(await shiftApi().summary(sessionId));
      setStep("review");
    });

  const close = () =>
    run(async () => {
      if (counted == null) return;
      const token = needsApproval
        ? (await shiftApi().approve(manager.userId.trim(), manager.password, VARIANCE_PERMISSION)).token
        : undefined;
      setClosed(await shiftApi().close(sessionId, counted, token));
      setManager(EMPTY_MANAGER_LOGIN);
      setStep("done");
    });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-8 print:static print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-full w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl print:border-0 print:shadow-none">
        <h2 className="text-xl font-bold text-white print:hidden">
          {step === "done" ? t("shift.doneTitle") : title}
        </h2>

        {step === "count" ? (
          <>
            <p className="text-sm text-slate-400">{t("shift.countHint")}</p>
            <CashCounter label={t("shift.counted")} value={counted} onChange={setCounted} />
          </>
        ) : null}

        {step === "review" && expected ? (
          <div className="space-y-3">
            <dl className="space-y-1 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">{t("shift.expected")}</dt>
                <dd className="tabular-nums text-white">{money(expected.expectedClosingCash)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">{t("shift.counted")}</dt>
                <dd className="tabular-nums text-white">{money(counted ?? 0)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt className="text-slate-300">{t("shift.difference")}</dt>
                <dd className="tabular-nums">
                  <Difference value={difference} />
                </dd>
              </div>
            </dl>
            {needsApproval ? (
              <div className="space-y-2">
                <p className="text-sm text-amber-300">{t("shift.needsApproval")}</p>
                <ManagerApprovalFields value={manager} onChange={setManager} />
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "done" && closed ? <ShiftReport summary={closed} /> : null}

        {error ? (
          <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 print:hidden">
          {step === "count" ? (
            <>
              {onCancel ? (
                <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                  {t("common.cancel")}
                </Button>
              ) : null}
              <Button type="button" onClick={() => void review()} disabled={busy || counted == null} isLoading={busy}>
                {t("shift.next")}
              </Button>
            </>
          ) : null}
          {step === "review" ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setStep("count")} disabled={busy}>
                {t("shift.back")}
              </Button>
              <Button
                type="button"
                onClick={() => void close()}
                disabled={busy || (needsApproval && !managerLoginFilled(manager))}
                isLoading={busy}
              >
                {busy ? t("shift.closing") : needsApproval ? t("shift.approve") : t("shift.closeButton")}
              </Button>
            </>
          ) : null}
          {step === "done" && closed ? (
            <>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                {t("shift.print")}
              </Button>
              <Button type="button" onClick={() => onClosed(closed)}>
                {t("shift.done")}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
