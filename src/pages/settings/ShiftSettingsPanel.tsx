import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { CashMovementDialog } from "@/components/shift/CashMovementDialog";
import { CloseShiftDialog } from "@/components/shift/CloseShiftDialog";
import { money } from "@/components/shift/shiftApi";
import { useCashier } from "@/core/presentation/hooks/useCashier";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { findCashMethod } from "@/lib/pos/cashCount";
import { SettingsSection } from "./settingsUi";

const time = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

/** The shift on this till: who opened it, with what, cash in and out, and ending it. */
export function ShiftSettingsPanel() {
  const { t } = useTranslation();
  const { currentShift, activePosSessionId, activeLocationId, shiftClosed } = usePosWorkspace();
  const { paymentMethods, fetchPaymentMethods } = useCashier();
  const [dialog, setDialog] = useState<"cash" | "close" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetchPaymentMethods().catch(() => undefined);
  }, [fetchPaymentMethods]);

  const shift = activePosSessionId ? currentShift?.shift : null;
  const isRoom = currentShift?.mode === "ROOM";

  return (
    <div className="space-y-4">
      <SettingsSection title={currentShift?.registerName || t("shift.tab")}>
        {shift ? (
          <div className="space-y-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{t("shift.current", { time: time(shift.openedAt) })}</dt>
                <dd className="font-medium text-slate-900">{t("shift.by", { name: shift.cashierName ?? "—" })}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t("shift.float")}</dt>
                <dd className="font-medium tabular-nums text-slate-900">{money(shift.openingCashFloat)}</dd>
              </div>
              {currentShift?.dueAt ? (
                <div>
                  <dt className="text-slate-500">{isRoom ? t("shift.roomTill") : t("shift.cashierTill")}</dt>
                  <dd className="font-medium text-slate-900">{t("shift.dueAt", { time: time(currentShift.dueAt) })}</dd>
                </div>
              ) : null}
            </dl>
            {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setDialog("cash")}>
                {t("shift.cashMoves")}
              </Button>
              <Button type="button" variant="destructive" onClick={() => setDialog("close")}>
                {isRoom ? t("shift.closeDay") : t("shift.endShift")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t("shift.none")}</p>
        )}
      </SettingsSection>

      {dialog === "cash" && activePosSessionId ? (
        <CashMovementDialog
          posSessionId={activePosSessionId}
          locationId={activeLocationId}
          cashMethodId={findCashMethod(paymentMethods)?.id}
          onCancel={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setNotice(t("shift.saved"));
          }}
        />
      ) : null}
      {dialog === "close" && activePosSessionId ? (
        <CloseShiftDialog
          sessionId={activePosSessionId}
          title={isRoom ? t("shift.closeDay") : t("shift.endShift")}
          onCancel={() => setDialog(null)}
          onClosed={() => {
            setDialog(null);
            void shiftClosed();
          }}
        />
      ) : null}
    </div>
  );
}
