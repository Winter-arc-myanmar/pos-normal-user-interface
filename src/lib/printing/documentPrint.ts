import { jsPDF } from "jspdf";
import { isMedianAppShell, openPdfInMedianViewer } from "./medianBridge";

const LINE_HEIGHT_MM = 4;
const MARGIN_MM = 3;
const FONT_SIZE = 8;

const sanitizeFilename = (title: string) =>
  title.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "receipt";

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
