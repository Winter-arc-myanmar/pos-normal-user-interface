type MedianShareBridge = {
  downloadFile?: (options: { url: string; open?: boolean }) => void | Promise<void>;
};

export type MedianWindowBridge = {
  share?: MedianShareBridge;
  posPrinter?: unknown;
};

export const medianShellBridge = (): MedianWindowBridge | undefined => {
  if (typeof window === "undefined") return undefined;
  const scoped = window as Window & {
    median?: MedianWindowBridge;
    gonative?: MedianWindowBridge;
  };
  return scoped.median || scoped.gonative;
};

export const isMedianAppShell = () =>
  typeof navigator !== "undefined" &&
  (Boolean(medianShellBridge()) || /Median|GoNative/i.test(navigator.userAgent));

/** Opens a PDF in Median's native viewer (Android/iOS print icon). No custom native build. */
export async function openPdfInMedianViewer(url: string): Promise<boolean> {
  const downloadFile = medianShellBridge()?.share?.downloadFile;
  if (!downloadFile) return false;
  await downloadFile({ url, open: true });
  return true;
}
