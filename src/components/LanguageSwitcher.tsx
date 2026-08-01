import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGE_OPTIONS = [
  { value: "en", labelKey: "language.english" },
  { value: "ko", labelKey: "language.korean" },
  { value: "my", labelKey: "language.myanmar" },
  { value: "zh-CN", labelKey: "language.chineseSimplified" },
] as const;

function resolveSelectedLanguage(language?: string) {
  if (!language) return "en";
  if (language === "zh-CN" || language.startsWith("zh")) return "zh-CN";
  if (language.startsWith("ko")) return "ko";
  if (language.startsWith("my")) return "my";
  return "en";
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
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
  const containerRef = useRef<HTMLDivElement>(null);

  const currentValue = resolveSelectedLanguage(
    i18n.resolvedLanguage ?? i18n.language
  );

  const currentLabel =
    LANGUAGE_OPTIONS.find((opt) => opt.value === currentValue)?.labelKey ??
    "language.english";

  const handleSelect = (value: string) => {
    void i18n.changeLanguage(value);
    setIsOpen(false);
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
    <div className="topbarLanguageSwitcher" ref={containerRef}>
      <span className="srOnly">{t("language.switchLanguage")}</span>
      <button
        type="button"
        className="topbarLanguageSelect"
        aria-label={t("language.switchLanguage")}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{t(currentLabel)}</span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <ul
          className="topbarLanguageDropdown"
          role="listbox"
          aria-label={t("language.switchLanguage")}
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = option.value === currentValue;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`topbarLanguageOption ${
                  isSelected ? "topbarLanguageOptionSelected" : ""
                }`}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(option.value);
                  }
                }}
                tabIndex={0}
              >
                {t(option.labelKey)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
