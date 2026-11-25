import { afterEach, describe, expect, it, vi } from "vitest";

import { canSendRawEscPos, hasNativePrinterBridge } from "../printerCapabilities";

const agent = vi.hoisted(() => ({ available: false }));

vi.mock("@/lib/printing/printAgent", () => ({
  isPrintAgentAvailable: () => agent.available,
}));

const binding = {
  id: "printer-1",
  transport: "NETWORK" as const,
  displayName: "Kitchen",
  host: "192.168.0.50",
  port: 9100,
  lastVerifiedAt: "",
};

const nativePlugin = {
  discover: vi.fn(async (_options?: Record<string, unknown>) => []),
  printRaw: vi.fn(async (_options?: Record<string, unknown>) => undefined),
};

const stubUserAgent = (userAgent: string) => vi.stubGlobal("navigator", { userAgent });

describe("canSendRawEscPos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.median;
    delete window.gonative;
    localStorage.clear();
    agent.available = false;
  });

  it("allows raw network printing on desktop", () => {
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0)");
    expect(canSendRawEscPos(binding)).toBe(true);
  });

  it("allows every transport through the desktop print agent", () => {
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0)");
    agent.available = true;
    expect(
      canSendRawEscPos({ ...binding, transport: "USB", deviceName: "POS-80" })
    ).toBe(true);
    expect(
      canSendRawEscPos({ ...binding, transport: "BLUETOOTH", deviceName: "COM5" })
    ).toBe(true);
  });

  it("uses PDF for network printers on Android", () => {
    stubUserAgent("Mozilla/5.0 (Linux; Android 14)");
    expect(canSendRawEscPos(binding)).toBe(false);
  });

  it("prefers raw printing on Android when the native bridge exists", () => {
    stubUserAgent("Mozilla/5.0 (Linux; Android 14)");
    window.median = { posPrinter: nativePlugin };
    expect(hasNativePrinterBridge()).toBe(true);
    expect(canSendRawEscPos(binding)).toBe(true);
  });

  it("detects the legacy gonative bridge", () => {
    stubUserAgent("Mozilla/5.0 (Linux; Android 14)");
    window.gonative = { posPrinter: nativePlugin };
    expect(hasNativePrinterBridge()).toBe(true);
  });
});
