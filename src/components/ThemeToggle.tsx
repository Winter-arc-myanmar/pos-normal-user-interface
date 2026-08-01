import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2.5 12H5M19 12h2.5M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.4 14.5A8.7 8.7 0 1 1 9.5 3.6 7 7 0 1 0 20.4 14.5z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? t("theme.switchToLightMode") : t("theme.switchToDarkMode");

  return (
    <button
      className="topbarIconButton themeToggleButton"
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
