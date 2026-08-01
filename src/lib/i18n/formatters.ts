import { useTranslation } from "react-i18next";

const resolveIntlLocale = (language: string) => {
  if (language === "my") return "my-MM";
  if (language === "ko") return "ko-KR";
  if (language === "zh-CN") return "zh-CN";
  return "en-US";
};

/**
 * Custom hook for localized date formatting
 */
export function useDateFormatter() {
  const { i18n } = useTranslation();

  const formatDate = (
    date: string | Date | undefined,
    options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ): string => {
    if (!date) return "-";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    const locale = resolveIntlLocale(i18n.language);

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  };

  const formatDateTime = (date: string | Date | undefined): string => {
    return formatDate(date, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateLong = (date: string | Date | undefined): string => {
    return formatDate(date, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return {
    formatDate,
    formatDateTime,
    formatDateLong,
  };
}

/**
 * Custom hook for localized number formatting
 */
export function useNumberFormatter() {
  const { i18n } = useTranslation();

  const formatNumber = (
    value: number | undefined,
    options: Intl.NumberFormatOptions = {}
  ): string => {
    if (value === null || value === undefined) return "-";

    const locale = resolveIntlLocale(i18n.language);

    return new Intl.NumberFormat(locale, options).format(value);
  };

  const formatCurrency = (
    value: number | undefined,
    currency: string = "USD"
  ): string => {
    return formatNumber(value, {
      style: "currency",
      currency: currency,
    });
  };

  const formatPercent = (value: number | undefined): string => {
    return formatNumber(value, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  return {
    formatNumber,
    formatCurrency,
    formatPercent,
  };
}

/**
 * Standalone formatter functions for use outside React components
 */
export const createDateFormatter = (locale: string) => {
  return (
    date: string | Date | undefined,
    options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ): string => {
    if (!date) return "-";

    const dateObj = typeof date === "string" ? new Date(date) : date;
    const formatLocale = resolveIntlLocale(locale);

    return new Intl.DateTimeFormat(formatLocale, options).format(dateObj);
  };
};

export const createNumberFormatter = (locale: string) => {
  return (
    value: number | undefined,
    options: Intl.NumberFormatOptions = {}
  ): string => {
    if (value === null || value === undefined) return "-";

    const formatLocale = resolveIntlLocale(locale);

    return new Intl.NumberFormat(formatLocale, options).format(value);
  };
};
