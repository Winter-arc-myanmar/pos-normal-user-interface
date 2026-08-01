import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { Button } from "@/components/ui/Button";
import { useUserManagement } from "@/core/presentation/hooks/useUserManagement";

export function UsersPage() {
  const { t } = useTranslation();
  const { users, totalUsers, isLoading, error, loadUsers, clearError } =
    useUserManagement();

  useEffect(() => {
    void loadUsers({ take: 20, skip: 0 }).catch(() => undefined);
  }, [loadUsers]);

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("users.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("users.description")}
          </p>
        </div>
        <Button
          variant="secondary"
          isLoading={isLoading}
          onClick={() => {
            clearError();
            void loadUsers({ take: 20, skip: 0 }).catch(() => undefined);
          }}
        >
          {isLoading ? t("common.refreshing") : t("common.refresh")}
        </Button>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {isLoading && users.length === 0 ? (
        <ApiLoadingState label={t("users.loading")} />
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("users.empty")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {t("users.total", { count: totalUsers })}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("users.columns.name")}</th>
                  <th className="px-4 py-3 font-semibold">{t("users.columns.email")}</th>
                  <th className="px-4 py-3 font-semibold">{t("users.columns.role")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3">{user.nickname || user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.adminRoleName || user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
