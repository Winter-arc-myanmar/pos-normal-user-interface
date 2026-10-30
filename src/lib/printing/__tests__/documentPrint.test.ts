import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildReceiptPdf,
  printLinesAsPdf,
  printLinesWithBrowserDialog,
} from "../documentPrint";

describe("documentPrint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete window.median;
    document.querySelectorAll("iframe.pos-print-frame").forEach((frame) => frame.remove());
  });

  it("builds a narrow receipt pdf", () => {
    const doc = buildReceiptPdf(["Beer  2", "TOTAL  10.00"], 80);
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("keeps the configured receipt text sizes in the PDF fallback", () => {
    const doc = buildReceiptPdf(["fallback"], 80, {
      columns: 48,
      rows: [
        { kind: "text", text: "Normal", align: "left", size: "normal", bold: false, invert: false },
        { kind: "text", text: "Tall", align: "left", size: "tall", bold: false, invert: false },
        { kind: "text", text: "Wide", align: "left", size: "wide", bold: false, invert: false },
        { kind: "text", text: "Big", align: "left", size: "huge", bold: true, invert: false },
      ],
    });
    const pdf = doc.output();

    expect(pdf).toContain("8 Tf");
    expect(pdf).toContain("16 Tf");
  });

  it("uses the Median bridge when available", async () => {
    const downloadFile = vi.fn();
    vi.stubGlobal("navigator", { userAgent: "Median Android" });
    window.median = { share: { downloadFile } };
    vi.stubGlobal("open", vi.fn());
    URL.createObjectURL = vi.fn(() => "blob:receipt");

    await printLinesAsPdf(["Kitchen ticket"], "ticket-1");

    expect(downloadFile).toHaveBeenCalledWith({ url: "blob:receipt", open: true });
    delete window.median;
  });

  it("opens a pdf blob for printing", async () => {
    const open = vi.fn().mockReturnValue({});
    vi.stubGlobal("open", open);
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });
    URL.createObjectURL = vi.fn(() => "blob:receipt");

    await printLinesAsPdf(["Kitchen ticket"], "ticket-1");

    expect(open).toHaveBeenCalledWith("blob:receipt", "_blank", "noopener,noreferrer");
  });

  it("shares a receipt PDF with Android printer apps", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const open = vi.fn();
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14)",
      share,
      canShare,
    });
    vi.stubGlobal("open", open);

    await printLinesWithBrowserDialog(["Coffee", "TOTAL  10.00"], "Receipt test");

    expect(canShare).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Receipt test", files: [expect.any(File)] })
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Receipt test", files: [expect.any(File)] })
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("opens a PDF on Android when file sharing is unavailable", async () => {
    const open = vi.fn().mockReturnValue({});
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14)" });
    vi.stubGlobal("open", open);
    URL.createObjectURL = vi.fn(() => "blob:android-receipt");

    await printLinesWithBrowserDialog(["Coffee"], "Receipt test");

    expect(open).toHaveBeenCalledWith(
      "blob:android-receipt",
      "_blank",
      "noopener,noreferrer"
    );
    expect(document.querySelector("iframe.pos-print-frame")).toBeNull();
  });

  it("opens a print-ready browser document on desktop", async () => {
    const printDocument = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };
    const printWindow = {
      document: printDocument,
      opener: null,
      close: vi.fn(),
    };
    const open = vi.fn().mockReturnValue(printWindow);
    vi.stubGlobal("open", open);
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });

    await printLinesWithBrowserDialog(["Coffee <large>", "TOTAL  10.00"], "Receipt & test");

    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(printDocument.write).toHaveBeenCalledWith(
      expect.stringContaining("Coffee &lt;large&gt;")
    );
    expect(printDocument.write).toHaveBeenCalledWith(
      expect.stringContaining("window.print()")
    );
    expect(printDocument.close).toHaveBeenCalled();
  });

  it("prints from a hidden iframe when the popup is blocked", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });
    vi.stubGlobal("open", vi.fn().mockReturnValue(null));
    vi.spyOn(window, "print").mockImplementation(() => undefined);

    await printLinesWithBrowserDialog(["Soup"], "Kitchen");

    const frame = document.querySelector("iframe.pos-print-frame");
    expect(frame).toBeTruthy();
    expect(frame?.getAttribute("aria-hidden")).toBe("true");
  });
});
