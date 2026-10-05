import { afterEach, describe, expect, it, vi } from "vitest";
import {
  callPosPrinter,
  hasNativePrinterBridge,
  medianPosPrinter,
  printLanTcp,
} from "../webPrinterTransports";

describe("printLanTcp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when the browser cannot open a raw TCP socket", async () => {
    await expect(printLanTcp("192.168.0.50", 9100, "TEST\n")).rejects.toThrow(
      /cannot open a Wi-Fi printer by IP/
    );
  });
});

describe("callPosPrinter", () => {
  afterEach(() => {
    delete window.median;
    delete window.gonative;
  });

  it("passes one options object and resolves a promise-returning plugin", async () => {
    const printRaw = vi.fn(async (options: Record<string, unknown>) => {
      expect(options.callback).toBeTypeOf("function");
      return { success: true };
    });
    window.median = { posPrinter: { discover: vi.fn(), printRaw } };

    await expect(
      callPosPrinter("printRaw", { transport: "NETWORK" })
    ).resolves.toEqual({ success: true });
    expect(printRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: "NETWORK",
        callback: expect.any(Function),
      })
    );
  });

  it("resolves from a callback-only plugin", async () => {
    window.median = {
      posPrinter: {
        discover: vi.fn(),
        printRaw: (options: Record<string, unknown>) => {
          (options.callback as (result: unknown) => void)?.({ success: true });
        },
      },
    };

    await expect(callPosPrinter("printRaw", {})).resolves.toEqual({
      success: true,
    });
  });

  it("rejects when the native side reports an error", async () => {
    window.median = {
      posPrinter: {
        discover: vi.fn(),
        printRaw: async () => ({ success: false, error: "No USB printer" }),
      },
    };

    await expect(callPosPrinter("printRaw", {})).rejects.toThrow("No USB printer");
  });

  it("rejects when the bridge is missing", async () => {
    await expect(callPosPrinter("printRaw", {})).rejects.toThrow(/native plugin/);
  });

  it("reads the legacy gonative alias", () => {
    window.gonative = { posPrinter: { discover: vi.fn(), printRaw: vi.fn() } };
    expect(hasNativePrinterBridge()).toBe(true);
    expect(medianPosPrinter()).toBeDefined();
  });
});
