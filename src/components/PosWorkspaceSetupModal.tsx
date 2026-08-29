import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { InventoryLocation, PosRegister } from "@/core/domain/entities/Cashier";

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

interface PosWorkspaceSetupModalProps {
  open: boolean;
  inventoryLocations: InventoryLocation[];
  activeLocationId: string;
  posRegisters: PosRegister[];
  activePosRegisterId: string;
  activePosSessionId: string;
  isLoading: boolean;
  errorMessage?: string | null;
  notice?: string | null;
  onLocationChange: (locationId: string) => void;
  onRegisterChange: (registerId: string) => void;
  onOpenSession: () => void;
  onContinue: () => void;
}

export function PosWorkspaceSetupModal({
  open,
  inventoryLocations,
  activeLocationId,
  posRegisters,
  activePosRegisterId,
  activePosSessionId,
  isLoading,
  errorMessage,
  notice,
  onLocationChange,
  onRegisterChange,
  onOpenSession,
  onContinue,
}: PosWorkspaceSetupModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const canContinue = Boolean(
    activeLocationId && activePosRegisterId && activePosSessionId && !isLoading
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-workspace-setup-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 text-center">
          <h2
            id="pos-workspace-setup-title"
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            {t("cashier.pos.setupTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("cashier.pos.setupSubtitle")}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              htmlFor="pos-setup-location"
            >
              {t("cashier.location")}
            </label>
            <select
              id="pos-setup-location"
              value={activeLocationId}
              onChange={(event) => onLocationChange(event.target.value)}
              className={inputClassName}
              disabled={isLoading}
            >
              <option value="">{t("cashier.selectLocation")}</option>
              {inventoryLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              htmlFor="pos-setup-register"
            >
              {t("cashier.pos.register")}
            </label>
            <select
              id="pos-setup-register"
              value={activePosRegisterId}
              onChange={(event) => onRegisterChange(event.target.value)}
              className={inputClassName}
              disabled={isLoading || !activeLocationId}
            >
              <option value="">{t("cashier.pos.selectRegister")}</option>
              {posRegisters.map((register) => (
                <option key={register.id} value={register.id}>
                  {register.name} ({register.code})
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activePosSessionId
              ? t("cashier.pos.sessionActive")
              : t("cashier.pos.sessionInactive")}
          </p>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </p>
          ) : null}

          {notice ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              {notice}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={isLoading || !activePosRegisterId || Boolean(activePosSessionId)}
              onClick={onOpenSession}
            >
              {t("cashier.pos.openSession")}
            </Button>
            <Button
              type="button"
              disabled={!canContinue}
              onClick={onContinue}
            >
              {t("cashier.pos.continue")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
