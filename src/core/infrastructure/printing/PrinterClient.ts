import { isPrintAgentAvailable } from "@/lib/printing/printAgent";

export type PrinterRuntime = "QZ" | "BROWSER" | "AGENT";

/** @deprecated Use BROWSER */
export type LegacyPrinterRuntime = "QZ" | "MEDIAN_ANDROID";

const isMobileOrTablet = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const isMedianShell = () =>
  typeof window !== "undefined" &&
  (Boolean(window.median) || /Median|GoNative/i.test(navigator.userAgent));

/**
 * Picks the printing engine.
 *
 * Mobile always wins so the Android bridge keeps working even if a desktop-style
 * shell is ever built for a phone. On desktop, a running print agent (a loopback
 * service the page probed at boot) beats QZ Tray, which remains the fallback for
 * computers that do not have the agent installed yet.
 */
export const printerRuntime = (): PrinterRuntime => {
  if (isMobileOrTablet() || isMedianShell()) return "BROWSER";
  if (isPrintAgentAvailable()) return "AGENT";
  return "QZ";
};

export const isBrowserPrinting = () => printerRuntime() === "BROWSER";

/** True when the desktop print agent is the active engine. */
export const isAgentPrinting = () => printerRuntime() === "AGENT";

/** @deprecated Use isBrowserPrinting */
export const isMedianPrinting = () => isBrowserPrinting();
