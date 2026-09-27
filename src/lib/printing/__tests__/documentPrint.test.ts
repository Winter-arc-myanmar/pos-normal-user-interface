import { describe, expect, it, vi } from "vitest";
import {
  buildReceiptPdf,
  printLinesAsPdf,
  printLinesWithBrowserDialog,
} from "../documentPrint";

describe("documentPrint", () => {
  it("builds a narrow receipt pdf", () => {
    const doc = buildReceiptPdf(["Beer  2", "TOTAL  10.00"], 80);
    expect(doc.getNumberOfPages()).toBe(1);
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

  it("opens a print-ready browser document for Android printing", async () => {
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
});
