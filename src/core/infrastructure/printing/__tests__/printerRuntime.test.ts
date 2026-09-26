import { afterEach, describe, expect, it, vi } from "vitest";
import { printerRuntime } from "../PrinterClient";

describe("printerRuntime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.median;
  });

  it("uses QZ on desktop browsers", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });
    expect(printerRuntime()).toBe("QZ");
  });

  it("uses browser printing on Android", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
    });
    expect(printerRuntime()).toBe("BROWSER");
  });

  it("uses browser printing inside a Median shell", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });
    window.median = { posPrinter: { discover: vi.fn(), printRaw: vi.fn() } };
    expect(printerRuntime()).toBe("BROWSER");
  });
});
