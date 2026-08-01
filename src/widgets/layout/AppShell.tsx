import { memo, type ReactNode, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 13.5h6.5V20H4z" />
      <path d="M13.5 4H20v9.5h-6.5z" />
      <path d="M4 4h6.5v6.5H4z" />
      <path d="M13.5 16.5H20V20h-6.5z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  );
}

type SidebarNavItemProps = {
  to: string;
  title: ReactNode;
  meta: string;
  icon: ReactNode;
};

const SidebarNavItem = memo(function SidebarNavItem({
  to,
  title,
  meta,
  icon,
}: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId="sidebarActivePill"
              className="navItemActivePill"
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.85 }}
            />
          ) : null}
          <span className="navItemIcon">{icon}</span>
          <span className="navItemBody">
            <span className="navItemTitle">{title}</span>
            <span className="navItemMeta">{meta}</span>
          </span>
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
    <div
      className={`appShell ${
        isSidebarExpanded ? "appShellSidebarExpanded" : "appShellSidebarCollapsed"
      }`}
    >
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brandText">
            <div className="brandTitle">{t("shell.brandTitle")}</div>
            <div className="brandSubtitle">{t("shell.brandSubtitle")}</div>
          </div>
        </div>

        <div className="navSectionLabel">{t("shell.mainMenu")}</div>
        <nav className="nav">
          {canAccess(PAGE_PERMISSIONS.dashboard) ? (
            <SidebarNavItem
              to="/dashboard"
              icon={<DashboardIcon />}
              title={t("shell.dashboardTitle")}
              meta={t("shell.dashboardMeta")}
            />
          ) : null}
          {canAccess(PAGE_PERMISSIONS.users) ? (
            <SidebarNavItem
              to="/users"
              icon={<UsersIcon />}
              title={t("shell.usersTitle")}
              meta={t("shell.usersMeta")}
            />
          ) : null}
          {canAccess(PAGE_PERMISSIONS.customers) ? (
            <SidebarNavItem
              to="/customers"
              icon={<CustomersIcon />}
              title={t("shell.customersTitle")}
              meta={t("shell.customersMeta")}
            />
          ) : null}
        </nav>

        <div className="navSectionLabel">{t("shell.workspace")}</div>
        <div className="sidebarInfoCard">
          <div className="sidebarInfoTitle">{t("shell.workspaceTitle")}</div>
          <div className="sidebarInfoText">{t("shell.workspaceText")}</div>
          <div className="sidebarVersion">
            {t("shell.appVersion", { version: APP_VERSION })}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbarLeft">
            <div>
              <div className="topbarEyebrow">{t("shell.topbarTitle")}</div>
              <div className="topbarSubtext">{t("shell.topbarSubtitle")}</div>
            </div>
          </div>
          <div className="topbarRight">
            <button
              className={`topbarIconButton sidebarToggleButton ${
                isSidebarExpanded ? "isActive" : ""
              }`}
              type="button"
              aria-label={t("shell.mainMenu")}
              aria-pressed={isSidebarExpanded}
              onClick={() => setIsSidebarExpanded((prev) => !prev)}
            >
              <GridIcon />
            </button>
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="topbarIdentity">
              <span className="topbarRole">{t("shell.signedInAs")}</span>
              <span className="topbarUser">{currentUserName}</span>
              <span className="topbarRole">
                {isFullAccess
                  ? t("shell.fullAccessRole")
                  : resolvedRoleName || t("shell.userRole")}
              </span>
            </div>
            <button
              className="btn topbarLogout"
              type="button"
              onClick={handleLogout}
            >
              {t("shell.logout")}
            </button>
          </div>
        </header>
        <main className="content">
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
