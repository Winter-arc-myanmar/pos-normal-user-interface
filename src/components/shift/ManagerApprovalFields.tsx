import { useTranslation } from "react-i18next";
import type { ManagerLogin } from "@/lib/pos/managerLogin";

const field =
  "min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-amber-500";

/** A manager types their own User ID and password on this till to approve. */
export function ManagerApprovalFields({
  value,
  onChange,
}: {
  value: ManagerLogin;
  onChange: (login: ManagerLogin) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input
        aria-label={t("shift.managerId")}
        placeholder={t("shift.managerId")}
        autoComplete="off"
        autoCapitalize="characters"
        className={field}
        value={value.userId}
        onChange={(event) => onChange({ ...value, userId: event.target.value })}
      />
      <input
        type="password"
        aria-label={t("shift.managerPassword")}
        placeholder={t("shift.managerPassword")}
        autoComplete="new-password"
        className={field}
        value={value.password}
        onChange={(event) => onChange({ ...value, password: event.target.value })}
      />
    </div>
  );
}
