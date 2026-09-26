import { afterEach, describe, expect, it, vi } from "vitest";
import { canSendRawEscPos } from "../printerCapabilities";

const binding = {
  id: "printer-1",
  transport: "NETWORK" as const,
  displayName: "Kitchen",
  host: "192.168.0.50",
  port: 9100,
  lastVerifiedAt: "",
};

describe("canSendRawEscPos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.median;
    localStorage.clear();
  });

  it("allows raw network printing on desktop", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    });
    expect(canSendRawEscPos(binding)).toBe(true);
  });

  it("uses PDF for network printers on Android", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14)",
    });
    expect(canSendRawEscPos(binding)).toBe(false);
  });
});
