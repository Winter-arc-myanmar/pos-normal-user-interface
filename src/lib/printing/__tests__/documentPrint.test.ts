import { describe, expect, it, vi } from "vitest";
import { buildReceiptPdf, printLinesAsPdf } from "../documentPrint";

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
});
