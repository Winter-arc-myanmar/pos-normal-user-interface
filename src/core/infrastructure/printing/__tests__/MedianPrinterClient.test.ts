import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrinterBinding } from "@/lib/pos/printerBindingStorage";
import type { MedianPosPrinterLike } from "@/lib/printing/webPrinterTransports";
import { MedianPrinterClient } from "../MedianPrinterClient";

const binding: PrinterBinding = {
  id: "network-1",
  transport: "NETWORK",
  displayName: "Kitchen",
  host: "192.168.1.50",
  port: 9100,
  lastVerifiedAt: "",
};

const plugin = {
  connect: vi.fn(async (_options?: Record<string, unknown>) => undefined),
  discover: vi.fn(async (_options?: Record<string, unknown>) => ({
    devices: [{ id: "usb-1", name: "Counter printer" }],
  })),
  printRaw: vi.fn(async (_options?: Record<string, unknown>) => undefined),
};

describe("MedianPrinterClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.median = { posPrinter: plugin };
  });

  afterEach(() => {
    delete window.median;
    delete window.gonative;
  });

  it("discovers stable native printer device IDs", async () => {
    const client = new MedianPrinterClient();

    await expect(client.findPrinters("USB")).resolves.toEqual(["usb-1"]);
    expect(plugin.discover).toHaveBeenCalledWith(
      expect.objectContaining({ transport: "USB" })
    );
  });

  it("sends ESC/POS bytes through the native bridge", async () => {
    const client = new MedianPrinterClient();

    await client.testPrint(binding);

    expect(plugin.printRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: "NETWORK",
        host: "192.168.1.50",
        port: 9100,
        dataBase64: expect.any(String),
        encoding: "base64",
      })
    );
  });

  it("supports a callback-only plugin", async () => {
    const callbackPlugin: MedianPosPrinterLike = {
      connect: (options = {}) => {
        (options.callback as (result: unknown) => void)?.({ success: true });
      },
      discover: (options = {}) => {
        (options.callback as (result: unknown) => void)?.({ devices: ["bt-1"] });
      },
      printRaw: (options = {}) => {
        (options.callback as (result: unknown) => void)?.({ success: true });
      },
    };
    window.median = { posPrinter: callbackPlugin };
    const client = new MedianPrinterClient();

    await expect(client.findPrinters("BLUETOOTH")).resolves.toEqual(["bt-1"]);
    await expect(client.testPrint(binding)).resolves.toBeUndefined();
  });

  it("rejects when the native side reports failure", async () => {
    window.median = {
      posPrinter: {
        connect: vi.fn(async (_options?: Record<string, unknown>) => undefined),
        discover: vi.fn(async (_options?: Record<string, unknown>) => []),
        printRaw: vi.fn(async () => ({
          success: false,
          error: "Printer not found",
        })),
      },
    };
    const client = new MedianPrinterClient();

    await expect(client.testPrint(binding)).rejects.toThrow("Printer not found");
  });
});
