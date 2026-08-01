import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { useTheme } from "@/theme/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";

type LayoutProps = {
  sidebar: ReactNode;
  headerExtra?: ReactNode;
  children?: ReactNode;
};

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function Layout({ sidebar, headerExtra, children }: LayoutProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <div className="flex-shrink-0 overflow-y-auto">
        {sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className={[
            "flex items-center justify-between gap-4 px-6 py-3",
            "border-b bg-white/95 backdrop-blur-sm",
            isDark
              ? "border-slate-800 bg-slate-950/95"
              : "border-slate-200",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={[
                "inline-flex items-center justify-center w-9 h-9 rounded-lg",
                "transition-colors duration-150",
                isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
              ].join(" ")}
              aria-label={t("layout.toggleMenu")}
            >
              <MenuIcon />
            </button>
            {headerExtra}
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              type="button"
              className={[
                "relative inline-flex items-center justify-center w-9 h-9 rounded-lg",
                "transition-colors duration-150",
                isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
              ].join(" ")}
              aria-label={t("layout.notifications")}
            >
              <BellIcon />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                3
              </span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Avatar */}
            <button
              type="button"
              className={[
                "inline-flex items-center justify-center w-9 h-9 rounded-lg",
                "transition-colors duration-150",
                isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
              ].join(" ")}
              aria-label={t("layout.userMenu")}
            >
              <UserIcon />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
