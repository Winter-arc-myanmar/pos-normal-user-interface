import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslations from "./locales/en.json";
import myTranslations from "./locales/my.json";
import koTranslations from "./locales/ko.json";
import zhCnTranslations from "./locales/zh-CN.json";

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

const resources = {
  en: {
    translation: enTranslations,
  },
  ko: {
    translation: deepMerge(
      enTranslations as TranslationTree,
      koTranslations as TranslationTree
    ),
  },
  my: {
    translation: deepMerge(
      enTranslations as TranslationTree,
      myTranslations as TranslationTree
    ),
  },
  "zh-CN": {
    translation: deepMerge(
      enTranslations as TranslationTree,
      zhCnTranslations as TranslationTree
    ),
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ["en", "ko", "my", "zh-CN"],
    fallbackLng: "en",
    debug: false,
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    interpolation: {
      escapeValue: false,
    },
    keySeparator: ".",
    nsSeparator: ":",
  });

i18n.on("languageChanged", (language) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
});

export default i18n;
