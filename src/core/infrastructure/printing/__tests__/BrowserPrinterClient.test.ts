import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserPrinterClient } from "../BrowserPrinterClient";
import * as documentPrint from "@/lib/printing/documentPrint";
import * as printerCapabilities from "@/lib/printing/printerCapabilities";

describe("BrowserPrinterClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.median;
  });

  it("uses the Android print sheet for a Wi-Fi printer when raw port 9100 is unavailable", async () => {
    vi.spyOn(printerCapabilities, "canSendRawEscPos").mockReturnValue(false);
    const printDialog = vi
      .spyOn(documentPrint, "printLinesWithBrowserDialog")
      .mockResolvedValue(undefined);
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

    expect(printDialog).toHaveBeenCalledWith(
      expect.arrayContaining(["PRINTER TEST", "Kitchen"]),
      "printer-test"
    );
  });

  it("opens the browser print dialog when raw ESC/POS is unavailable", async () => {
    vi.spyOn(printerCapabilities, "canSendRawEscPos").mockReturnValue(false);
    const printDialog = vi
      .spyOn(documentPrint, "printLinesWithBrowserDialog")
      .mockResolvedValue(undefined);
    const client = new BrowserPrinterClient();
    client.configureScope("tenant-1", "register-1");

    await client.testPrint({
      id: "printer-1",
      transport: "USB",
      displayName: "Kitchen",
      deviceName: "POS-80",
      lastVerifiedAt: "",
      lastError: null,
    });

    expect(printDialog).toHaveBeenCalledWith(
      expect.arrayContaining(["PRINTER TEST", "Kitchen"]),
      "printer-test"
    );
  });
});
