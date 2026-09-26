import { afterEach, describe, expect, it, vi } from "vitest";
import { printLanTcp } from "../webPrinterTransports";

describe("printLanTcp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when the browser cannot open a raw TCP socket", async () => {
    await expect(printLanTcp("192.168.0.50", 9100, "TEST\n")).rejects.toThrow(
      /not available/
    );
  });
});
