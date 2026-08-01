import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { useUserManagement } from "@/core/presentation/hooks/useUserManagement";

/**
 * Thin example page wired through the architecture layers:
 * page -> useUserManagement -> UserManagementService -> ApiUserRepository
 */
export function UsersPage() {
  const { t } = useTranslation();
  const { users, totalUsers, isLoading, error, loadUsers, clearError } =
    useUserManagement();

  useEffect(() => {
    void loadUsers({ take: 20, skip: 0 }).catch(() => undefined);
  }, [loadUsers]);

  return (
    <section className="page">
      <header className="pageHeader">
        <div>
          <h1 className="pageTitle">{t("users.title")}</h1>
          <p className="pageDescription">{t("users.description")}</p>
        </div>
        <button
          type="button"
          className="verificationActionButton"
          onClick={() => {
            clearError();
            void loadUsers({ take: 20, skip: 0 }).catch(() => undefined);
          }}
          disabled={isLoading}
        >
          {isLoading ? t("common.refreshing") : t("common.refresh")}
        </button>
      </header>

      {error ? <p className="authError">{error}</p> : null}

      {isLoading && users.length === 0 ? (
        <ApiLoadingState label={t("users.loading")} />
      ) : users.length === 0 ? (
        <div className="card">
          <p className="muted">{t("users.empty")}</p>
        </div>
      ) : (
        <div className="card">
          <p className="muted" style={{ marginBottom: 12 }}>
            {t("users.total", { count: totalUsers })}
          </p>
          <div className="verificationTableWrap">
            <table className="verificationTable">
              <thead>
                <tr>
                  <th>{t("users.columns.name")}</th>
                  <th>{t("users.columns.email")}</th>
                  <th>{t("users.columns.role")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.nickname || user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.adminRoleName || user.role}</td>
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
