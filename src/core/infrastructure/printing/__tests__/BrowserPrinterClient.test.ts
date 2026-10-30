import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserPrinterClient } from "../BrowserPrinterClient";
import * as documentPrint from "@/lib/printing/documentPrint";
import * as printerCapabilities from "@/lib/printing/printerCapabilities";

describe("BrowserPrinterClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.median;
    delete window.gonative;
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
      "printer-test",
      80,
      undefined
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
      "printer-test",
      80,
      undefined
    );
  });

  it("keeps the configured paper width in the browser fallback", async () => {
    vi.spyOn(printerCapabilities, "canSendRawEscPos").mockReturnValue(false);
    const printDialog = vi
      .spyOn(documentPrint, "printLinesWithBrowserDialog")
      .mockResolvedValue(undefined);
    const client = new BrowserPrinterClient();

    await client.printReceipt(
      {
        id: "printer-58",
        transport: "USB",
        displayName: "58mm counter",
        deviceName: "POS-58",
        lastVerifiedAt: "",
      },
      {
        title: "Customer bill",
        paperWidth: "MM58",
        lines: [{ name: "A product name which needs consistent wrapping", quantity: "1" }],
        total: "1000",
      }
    );

    expect(printDialog).toHaveBeenCalledWith(
      expect.any(Array),
      "Customer bill",
      58,
      expect.objectContaining({ rows: expect.any(Array) })
    );
  });

  it("prefers the native bridge over the Android print sheet", async () => {
    const printRaw = vi.fn(async (_options?: Record<string, unknown>) => undefined);
    window.median = {
      posPrinter: {
        connect: vi.fn(async (_options?: Record<string, unknown>) => undefined),
        discover: vi.fn(async (_options?: Record<string, unknown>) => []),
        printRaw,
      },
    };
    const printDialog = vi
      .spyOn(documentPrint, "printLinesWithBrowserDialog")
      .mockResolvedValue(undefined);
    const client = new BrowserPrinterClient();

    await client.testPrint({
      id: "printer-1",
      transport: "NETWORK",
      displayName: "Kitchen",
      host: "192.168.1.50",
      port: 9100,
      lastVerifiedAt: "",
      lastError: null,
    });

    expect(printRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: "NETWORK",
        host: "192.168.1.50",
        port: 9100,
        encoding: "base64",
      })
    );
    expect(printDialog).not.toHaveBeenCalled();
  });
});
