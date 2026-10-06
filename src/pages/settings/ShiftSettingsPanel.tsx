import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { CloseShiftDialog } from "@/components/shift/CloseShiftDialog";
import { ShiftReport } from "@/components/shift/ShiftReport";
import { shiftApi } from "@/components/shift/shiftApi";
import type { ShiftSummary } from "@/core/domain/entities/Shift";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { SettingsSection } from "./settingsUi";

const time = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

/** The shift on this till: who has it, what it has sold so far, and ending it. */
export function ShiftSettingsPanel() {
  const { t } = useTranslation();
  const { currentShift, activePosSessionId, shiftClosed } = usePosWorkspace();
  const [report, setReport] = useState<ShiftSummary | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!activePosSessionId) return;
    let live = true;
    shiftApi()
      .summary(activePosSessionId)
      .then((summary) => live && setReport(summary))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [activePosSessionId]);

  const shift = activePosSessionId ? currentShift?.shift : null;
  const isRoom = currentShift?.mode === "ROOM";
  const endLabel = isRoom ? t("shift.closeDay") : t("shift.endShift");

  return (
    <div className="space-y-4">
      <SettingsSection title={currentShift?.registerName || t("shift.tab")}>
        {shift ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {t("shift.current", { time: time(shift.openedAt) })} · {t("shift.by", { name: shift.cashierName ?? "—" })}
              {currentShift?.dueAt ? ` · ${t("shift.dueAt", { time: time(currentShift.dueAt) })}` : ""}
            </p>
            {report ? <ShiftReport summary={report} /> : null}
            <Button type="button" variant="destructive" onClick={() => setClosing(true)}>
              {endLabel}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t("shift.none")}</p>
        )}
      </SettingsSection>

      {closing && activePosSessionId ? (
        <CloseShiftDialog
          sessionId={activePosSessionId}
          title={endLabel}
          onCancel={() => setClosing(false)}
          onClosed={() => {
            setClosing(false);
            void shiftClosed();
          }}
        />
      ) : null}
    </div>
  );
}
