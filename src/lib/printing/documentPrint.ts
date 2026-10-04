import { jsPDF } from "jspdf";
import { isMedianAppShell, openPdfInMedianViewer } from "./medianBridge";

const LINE_HEIGHT_MM = 4;
const MARGIN_MM = 3;
const FONT_SIZE = 8;

const sanitizeFilename = (title: string) =>
  title.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "receipt";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const measureLines = (doc: jsPDF, lines: string[], widthMm: number) => {
  const maxWidth = widthMm - MARGIN_MM * 2;
  let count = 0;
  for (const line of lines) {
    count += doc.splitTextToSize(line, maxWidth).length;
  }
  return count;
};

export function buildReceiptPdf(lines: string[], paperWidthMm = 80): jsPDF {
  const scratch = new jsPDF({
    unit: "mm",
    format: [paperWidthMm, 40],
    orientation: "portrait",
  });
  scratch.setFont("courier", "normal");
  scratch.setFontSize(FONT_SIZE);
  const lineCount = measureLines(scratch, lines, paperWidthMm);
  const height = Math.max(40, MARGIN_MM * 2 + lineCount * LINE_HEIGHT_MM + 6);
  const doc = new jsPDF({
    unit: "mm",
    format: [paperWidthMm, height],
    orientation: "portrait",
  });
  doc.setFont("courier", "normal");
  doc.setFontSize(FONT_SIZE);
  let y = MARGIN_MM + 4;
  const maxWidth = paperWidthMm - MARGIN_MM * 2;
  for (const line of lines) {
    const parts = doc.splitTextToSize(line, maxWidth);
    for (const part of parts) {
      doc.text(part, MARGIN_MM, y);
      y += LINE_HEIGHT_MM;
    }
  }
  return doc;
}

const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const isStandalonePwa = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches === true ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

/** Same-origin hidden iframe. Android PWAs block window.open; this is how the Thuta POS prints. */
const createHiddenPrintFrame = () => {
  const frame = document.createElement("iframe");
  frame.className = "pos-print-frame";
  frame.title = "Print document";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 120_000);
  return frame;
};

const resolvePrintWindow = (): Window => {
  if (isMobileDevice() || isStandalonePwa()) {
    const frame = createHiddenPrintFrame();
    if (frame.contentWindow) return frame.contentWindow;
  }
  const opened = window.open("about:blank", "_blank");
  if (opened) return opened;
  const frame = createHiddenPrintFrame();
  if (frame.contentWindow) return frame.contentWindow;
  throw new Error("Unable to open the print dialog. Allow popups and try again.");
};

const downloadPdf = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Opens a print-ready receipt document and invokes the operating system's
 * print dialog. This matches the browser-print flow used by the Android POS
 * reference application, so Median can hand printing to Android without QZ
 * Tray or a custom native printer plugin.
 */
export async function printLinesWithBrowserDialog(
  lines: string[],
  title: string,
  paperWidthMm = 80
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Browser printing is only available in the browser");
  }

  const printWindow = resolvePrintWindow();

  const safeTitle = escapeHtml(title);
  const receiptLines = lines
    .map((line) => `<div class="line">${escapeHtml(line)}</div>`)
    .join("");

  try {
    try {
      printWindow.opener = null;
    } catch {
      // Hidden iframes used on Android may not allow opener writes.
    }
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      @page { size: ${paperWidthMm}mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #e5e7eb;
        color: #111827;
        font: 600 12px/1.35 "Courier New", monospace;
      }
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 1;
        padding: 10px;
        text-align: center;
        background: #111827;
      }
      .toolbar button {
        border: 0;
        border-radius: 4px;
        padding: 8px 14px;
        color: #fff;
        background: #2563eb;
        font: inherit;
      }
      .receipt {
        width: ${paperWidthMm}mm;
        min-height: 40mm;
        margin: 12px auto;
        padding: 4mm;
        overflow: hidden;
        background: #fff;
      }
      .line {
        min-height: 1.35em;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      @media print {
        body { background: #fff; }
        .toolbar { display: none; }
        .receipt { margin: 0; box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="toolbar"><button type="button" onclick="window.print()">Print</button></div>
    <main class="receipt">${receiptLines}</main>
    <script>
      window.addEventListener("load", function () {
        window.setTimeout(function () { window.print(); }, 0);
      });
    <\/script>
  </body>
</html>`);
    printWindow.document.close();
  } catch (caught) {
    try {
      printWindow.close();
    } catch {
      // Iframe print targets do not always implement close().
    }
    throw caught instanceof Error
      ? caught
      : new Error("Unable to create the print document");
  }
}

export async function printLinesAsPdf(
  lines: string[],
  title: string,
  paperWidthMm = 80
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF printing is only available in the browser");
  }
  const doc = buildReceiptPdf(lines, paperWidthMm);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const filename = `${sanitizeFilename(title)}.pdf`;

  if (isMedianAppShell()) {
    const openedInMedian = await openPdfInMedianViewer(url);
    if (openedInMedian) {
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      return;
    }
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    downloadPdf(url, filename);
  } else if (isMobileDevice()) {
    // Median Android often blocks popups; offer a download as well.
    window.setTimeout(() => downloadPdf(url, filename), 300);
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
