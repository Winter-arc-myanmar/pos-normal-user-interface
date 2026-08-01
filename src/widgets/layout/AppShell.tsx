import { memo, type ReactNode, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/motion/PageTransition";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import {
  PAGE_PERMISSIONS,
  usePermissions,
} from "@/features/permissions/usePermissions";
import packageJson from "../../../package.json";

const APP_VERSION = packageJson.version;

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M4 13.5h6.5V20H4z" />
      <path d="M13.5 4H20v9.5h-6.5z" />
      <path d="M4 4h6.5v6.5H4z" />
      <path d="M13.5 16.5H20V20h-6.5z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  );
}

type SidebarNavItemProps = {
  to: string;
  title: ReactNode;
  meta: string;
  icon: ReactNode;
  collapsed: boolean;
};

const SidebarNavItem = memo(function SidebarNavItem({
  to,
  title,
  meta,
  icon,
  collapsed,
}: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      title={collapsed ? String(title) : undefined}
      className={({ isActive }) =>
        [
          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-white/10 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white",
          collapsed ? "justify-center" : "",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId="sidebarActivePill"
              className="absolute inset-0 rounded-xl bg-white/10"
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.85 }}
            />
          ) : null}
          <span className="relative z-10 shrink-0">{icon}</span>
          {!collapsed ? (
            <span className="relative z-10 min-w-0">
              <span className="block truncate font-medium">{title}</span>
              <span className="block truncate text-xs text-slate-400">{meta}</span>
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
});

export function AppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { canAccess, isFullAccess, resolvedRoleName } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserName = user?.nickname || user?.name || t("shell.userFallback");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    const storedValue = window.localStorage.getItem("sidebarExpanded");
    return storedValue === null ? true : storedValue === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("sidebarExpanded", String(isSidebarExpanded));
  }, [isSidebarExpanded]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside
        className={[
          "flex shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-white transition-[width] duration-200",
          isSidebarExpanded ? "w-72" : "w-[4.5rem]",
        ].join(" ")}
      >
        <div className="border-b border-white/10 px-4 py-5">
          {!isSidebarExpanded ? (
            <div className="flex justify-center text-lg font-bold">A</div>
          ) : (
            <div>
              <div className="text-lg font-bold tracking-tight">{t("shell.brandTitle")}</div>
              <div className="mt-1 text-xs text-slate-400">{t("shell.brandSubtitle")}</div>
            </div>
          )}
        </div>

        {!isSidebarExpanded ? null : (
          <div className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("shell.mainMenu")}
          </div>
        )}

        <nav className="flex flex-col gap-1 px-3 py-3">
          {canAccess(PAGE_PERMISSIONS.dashboard) ? (
            <SidebarNavItem
              to="/dashboard"
              collapsed={!isSidebarExpanded}
              icon={<DashboardIcon />}
              title={t("shell.dashboardTitle")}
              meta={t("shell.dashboardMeta")}
            />
          ) : null}
          {canAccess(PAGE_PERMISSIONS.users) ? (
            <SidebarNavItem
              to="/users"
              collapsed={!isSidebarExpanded}
              icon={<UsersIcon />}
              title={t("shell.usersTitle")}
              meta={t("shell.usersMeta")}
            />
          ) : null}
          {canAccess(PAGE_PERMISSIONS.customers) ? (
            <SidebarNavItem
              to="/customers"
              collapsed={!isSidebarExpanded}
              icon={<CustomersIcon />}
              title={t("shell.customersTitle")}
              meta={t("shell.customersMeta")}
            />
          ) : null}
        </nav>

        <div className="mt-auto border-t border-white/10 p-3">
          {!isSidebarExpanded ? null : (
            <>
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t("shell.workspace")}
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-medium">{t("shell.workspaceTitle")}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {t("shell.workspaceText")}
                </p>
                <div className="mt-2 text-[11px] text-slate-500">
                  {t("shell.appVersion", { version: APP_VERSION })}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("shell.topbarTitle")}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {t("shell.topbarSubtitle")}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 dark:text-slate-300"
              aria-label={t("shell.mainMenu")}
              aria-pressed={isSidebarExpanded}
              onClick={() => setIsSidebarExpanded((prev) => !prev)}
            >
              <GridIcon />
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("shell.signedInAs")}
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {currentUserName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {isFullAccess
                  ? t("shell.fullAccessRole")
                  : resolvedRoleName || t("shell.userRole")}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              {t("shell.logout")}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
