import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserPrinterClient } from "../BrowserPrinterClient";
import * as documentPrint from "@/lib/printing/documentPrint";
import * as printerCapabilities from "@/lib/printing/printerCapabilities";

describe("BrowserPrinterClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.median;
  });

  it("falls back to PDF when raw ESC/POS is unavailable", async () => {
    vi.spyOn(printerCapabilities, "canSendRawEscPos").mockReturnValue(false);
    const pdf = vi.spyOn(documentPrint, "printLinesAsPdf").mockResolvedValue(undefined);
    const client = new BrowserPrinterClient();
    client.configureScope("tenant-1", "register-1");

    await client.testPrint({
      id: "printer-1",
      transport: "NETWORK",
      displayName: "Kitchen",
      host: "192.168.1.50",
      port: 9100,
      lastVerifiedAt: "",
      lastError: null,
    });

    expect(pdf).toHaveBeenCalledWith(
      expect.arrayContaining(["PRINTER TEST", "Kitchen"]),
      "printer-test"
    );
  });
});
