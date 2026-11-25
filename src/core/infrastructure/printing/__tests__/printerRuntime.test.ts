import { afterEach, describe, expect, it, vi } from "vitest";
import { printerRuntime } from "../PrinterClient";

// The runtime asks the agent module whether a probe found a service.
const agent = vi.hoisted(() => ({ available: false }));

vi.mock("@/lib/printing/printAgent", () => ({
  isPrintAgentAvailable: () => agent.available,
  printAgentHealth: () => null,
  probePrintAgent: async () => null,
  resetPrintAgentProbe: () => undefined,
}));

const stubUserAgent = (userAgent: string) =>
  vi.stubGlobal("navigator", { userAgent });

describe("printerRuntime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.median;
    agent.available = false;
  });

  it("uses QZ on desktop browsers without an agent", () => {
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0)");
    expect(printerRuntime()).toBe("QZ");
  });

  it("uses the print agent on a desktop that runs it", () => {
    agent.available = true;
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0)");
    expect(printerRuntime()).toBe("AGENT");
  });

  it("keeps browser printing on Android even when an agent answers", () => {
    agent.available = true;
    stubUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    expect(printerRuntime()).toBe("BROWSER");
  });

  it("uses browser printing inside a Median shell", () => {
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0)");
    window.median = { posPrinter: { discover: vi.fn(), printRaw: vi.fn() } };
    expect(printerRuntime()).toBe("BROWSER");
  });
});

