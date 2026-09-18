import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslations from "./locales/en.json";
import myTranslations from "./locales/my.json";

export const SUPPORTED_LANGUAGES = ["en", "my"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "i18nextLng";

type TranslationTree = Record<string, unknown>;

function isObject(value: unknown): value is TranslationTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
  base: TranslationTree,
  override: TranslationTree
): TranslationTree {
  const result: TranslationTree = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];
    if (isObject(existing) && isObject(value)) {
      result[key] = deepMerge(existing, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function normalizeAppLanguage(language?: string | null): AppLanguage {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("my")) return "my";
  if (value.startsWith("en")) return "en";
  return "en";
}

function persistLanguage(language: AppLanguage) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore private-mode storage failures.
  }
}

const resources = {
  en: {
    translation: enTranslations,
  },
  my: {
    translation: deepMerge(
      enTranslations as TranslationTree,
      myTranslations as TranslationTree
    ),
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    load: "currentOnly",
    fallbackLng: "en",
    defaultNS: "translation",
    ns: ["translation"],
    debug: false,
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: STORAGE_KEY,
      convertDetectedLanguage: (language) => normalizeAppLanguage(language),
    },
    interpolation: {
      escapeValue: false,
    },
    keySeparator: ".",
    nsSeparator: ":",
    react: {
      useSuspense: false,
      bindI18n: "languageChanged loaded",
    },
  });

i18n.on("languageChanged", (language) => {
  persistLanguage(normalizeAppLanguage(language));
});

if (i18n.isInitialized) {
  persistLanguage(normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language));
}

export async function setAppLanguage(language: string): Promise<AppLanguage> {
  const lng = normalizeAppLanguage(language);
  persistLanguage(lng);
  await i18n.changeLanguage(lng);
  persistLanguage(lng);
  return lng;
}

export default i18n;
