import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  normalizeAppLanguage,
  setAppLanguage,
  type AppLanguage,
} from "@/lib/i18n";

const LANGUAGE_OPTIONS: Array<{ value: AppLanguage; nativeLabel: string }> = [
  { value: "en", nativeLabel: "English" },
  { value: "my", nativeLabel: "မြန်မာ" },
];

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<AppLanguage>(() =>
    normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = (language: string) => {
      setCurrentValue(normalizeAppLanguage(language));
    };
    sync(i18n.resolvedLanguage ?? i18n.language);
    i18n.on("languageChanged", sync);
    return () => {
      i18n.off("languageChanged", sync);
    };
  }, [i18n]);

  const currentLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === currentValue)
      ?.nativeLabel ?? "English";

  const handleSelect = (value: AppLanguage) => {
    setCurrentValue(value);
    setIsOpen(false);
    void setAppLanguage(value);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label={t("language.switchLanguage")}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{currentLabel}</span>
        <ChevronDownIcon />
      </button>

      {isOpen ? (
        <ul
          className="absolute right-0 z-30 mt-2 min-w-[10rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          role="listbox"
          aria-label={t("language.switchLanguage")}
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = option.value === currentValue;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    "flex w-full cursor-pointer px-3 py-2 text-left text-sm",
                    isSelected
                      ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-white"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                  ].join(" ")}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.nativeLabel}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
