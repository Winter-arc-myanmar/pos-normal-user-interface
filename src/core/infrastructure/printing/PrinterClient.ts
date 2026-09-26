export type PrinterRuntime = "QZ" | "BROWSER";

/** @deprecated Use BROWSER */
export type LegacyPrinterRuntime = "QZ" | "MEDIAN_ANDROID";

const isMobileOrTablet = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const isMedianShell = () =>
  typeof window !== "undefined" &&
  (Boolean(window.median) || /Median|GoNative/i.test(navigator.userAgent));

/** Desktop uses QZ Tray. Android, iOS, and Median WebView use browser/WebUSB/BT/LAN transports. */
export const printerRuntime = (): PrinterRuntime => {
  if (isMobileOrTablet() || isMedianShell()) return "BROWSER";
  return "QZ";
};

export const isBrowserPrinting = () => printerRuntime() === "BROWSER";

/** @deprecated Use isBrowserPrinting */
export const isMedianPrinting = () => isBrowserPrinting();