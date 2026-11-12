import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  useChangePassword,
} from "@/core/presentation/hooks/useChangePassword";
import { SettingsField, SettingsSection } from "./settingsUi";

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-2 text-sm last:border-b-0 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-slate-900">
        {value || "—"}
      </dd>
    </div>
  );
}

/**
 * The signed-in person's own profile: who they are signed in as, and changing
 * their own password (any signed-in person, on any app).
 */
export function ProfileSettingsPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isSaving, error, changed, changePassword, reset } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const displayName = user?.nickname || user?.name || t("shell.userFallback");
  const roleLabel =
    user?.role === "ADMIN"
      ? t("settings.profile.roleAdmin")
      : t("settings.profile.roleStaff");
  const message = formError || error;

  const edit =
    (setter: (value: string) => void) => (value: string) => {
      setFormError(null);
      reset();
      setter(value);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError(t("settings.profile.fillAll"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t("settings.profile.mismatch"));
      return;
    }

    setFormError(null);
    const done = await changePassword(currentPassword, newPassword);
    if (done) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="space-y-4">
      <SettingsSection title={t("settings.profile.title")}>
        <dl>
          <AccountRow label={t("settings.profile.name")} value={displayName} />
          <AccountRow
            label={t("settings.profile.loginId")}
            value={user?.loginId || ""}
          />
          <AccountRow label={t("settings.profile.role")} value={roleLabel} />
        </dl>
      </SettingsSection>

      <SettingsSection title={t("settings.profile.passwordTitle")}>
        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <p className="text-sm leading-6 text-slate-500">
            {t("settings.profile.passwordHint", {
              min: PASSWORD_MIN_LENGTH,
              max: PASSWORD_MAX_LENGTH,
            })}
          </p>

          <SettingsField
            label={t("settings.profile.currentPassword")}
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={edit(setCurrentPassword)}
          />
          <SettingsField
            label={t("settings.profile.newPassword")}
            type="password"
            name="newPassword"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={newPassword}
            onChange={edit(setNewPassword)}
          />
          <SettingsField
            label={t("settings.profile.confirmPassword")}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirmPassword}
            onChange={edit(setConfirmPassword)}
          />

          {message ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {message}
            </p>
          ) : null}
          {changed && !message ? (
            <p role="status" className="text-sm font-medium text-emerald-600">
              {t("settings.profile.saved")}
            </p>
          ) : null}

          <div className="pt-1">
            <Button type="submit" isLoading={isSaving} disabled={isSaving}>
              {isSaving
                ? t("settings.profile.saving")
                : t("settings.profile.submit")}
            </Button>
          </div>
        </form>
      </SettingsSection>
    </div>
  );
}
