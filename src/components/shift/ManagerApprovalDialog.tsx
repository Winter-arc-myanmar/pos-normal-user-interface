import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { EMPTY_MANAGER_LOGIN, ManagerLogin, managerLoginFilled } from "@/lib/pos/managerLogin";
import { ManagerApprovalFields } from "./ManagerApprovalFields";
import { shiftApi } from "./shiftApi";

/**
 * Asks a manager to sign something off on this till: they type their own User ID
 * and password, and what they approve runs with the token that gives.
 */
export function ManagerApprovalDialog({
  title,
  children,
  permission,
  confirmLabel,
  onApproved,
  onCancel,
}: {
  title: string;
  children?: ReactNode;
  permission: string;
  confirmLabel: string;
  onApproved: (approverToken: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [manager, setManager] = useState<ManagerLogin>(EMPTY_MANAGER_LOGIN);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!managerLoginFilled(manager)) {
      setError(t("shift.managerRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { token } = await shiftApi().approve(manager.userId.trim(), manager.password, permission);
      await onApproved(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-slate-700 bg-slate-950 p-5 text-white">
        <h2 className="text-lg font-bold">{title}</h2>
        {children ? <div className="text-sm text-slate-300">{children}</div> : null}
        <div className="space-y-1">
          <p className="text-sm">{t("shift.managerApproval")}</p>
          <ManagerApprovalFields value={manager} onChange={setManager} />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button isLoading={busy} onClick={() => void confirm()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
