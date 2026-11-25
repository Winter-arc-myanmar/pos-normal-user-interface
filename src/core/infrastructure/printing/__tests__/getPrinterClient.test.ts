import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrintAgentError } from "@/lib/printing/printAgent";

/** The probe the print agent module would answer with, under test control. */
const agent = vi.hoisted(() => ({
  available: true,
  probe: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@/lib/printing/printAgent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/printing/printAgent")>();
  return {
    ...actual,
    probePrintAgent: agent.probe,
    resetPrintAgentProbe: agent.reset,
    isPrintAgentAvailable: () => agent.available,
  };
});

const printerClient = () => ({
  isConnected: vi.fn(() => true),
  connect: vi.fn(async () => undefined),
  disconnect: vi.fn(async () => undefined),
  findPrinters: vi.fn(async () => [] as string[]),
  testPrint: vi.fn(async () => undefined),
  printKdsTicket: vi.fn(async () => undefined),
  printKitchen: vi.fn(async () => undefined),
  printReceipt: vi.fn(async () => undefined),
  configureScope: vi.fn(),
});

const clients = vi.hoisted(() => ({ agent: {}, qz: {}, browser: {} }));

vi.mock("../HttpPrintAgentClient", () => ({ httpPrintAgentClient: clients.agent }));
vi.mock("../QzTrayClient", () => ({ qzTrayClient: clients.qz }));
vi.mock("../BrowserPrinterClient", () => ({ browserPrinterClient: clients.browser }));

import { getPrinterClient, resetPrinterClientCache } from "../getPrinterClient";

type MockedClient = ReturnType<typeof printerClient>;

const readyProbe = { status: "ready", health: { token: "token-1" }, error: null };
const absentProbe = { status: "absent", health: null, error: null };

const binding = {
  id: "printer-1",
  transport: "NETWORK" as const,
  displayName: "Till",
  host: "10.0.0.5",
  port: 9100,
  lastVerifiedAt: "",
};

const stubUserAgent = (userAgent: string) => vi.stubGlobal("navigator", { userAgent });

const desktop = () => stubUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
const phone = () => stubUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)");

/** The agent answers the first probe, then is gone for the next one. */
const agentGoesAwayAfterBoot = () => {
  let probes = 0;
  agent.probe.mockImplementation(async () => {
    probes += 1;
    if (probes === 1) return readyProbe;
    agent.available = false;
    return absentProbe;
  });
};

const agentClient = () => clients.agent as MockedClient;
const qzClient = () => clients.qz as MockedClient;
const browserClient = () => clients.browser as MockedClient;

beforeEach(() => {
  resetPrinterClientCache();
  vi.clearAllMocks();
  agent.available = true;
  agent.probe.mockResolvedValue(readyProbe);
  Object.assign(clients.agent, printerClient());
  Object.assign(clients.qz, printerClient());
  Object.assign(clients.browser, printerClient());
  desktop();
});

afterEach(() => {
  resetPrinterClientCache();
  vi.unstubAllGlobals();
  delete window.median;
});

describe("getPrinterClient", () => {
  it("sends the job straight to the agent while it is running", async () => {
    const client = await getPrinterClient();

    await client.testPrint(binding);

    expect(agentClient().testPrint).toHaveBeenCalledWith(binding);
    expect(qzClient().testPrint).not.toHaveBeenCalled();
  });

  it("falls back to QZ and retries the same job when the agent connection drops", async () => {
    const dropped = new PrintAgentError("PRINT_AGENT_CONNECTION_LOST", "The agent dropped us.");
    agentClient().testPrint.mockRejectedValueOnce(dropped);
    agentGoesAwayAfterBoot();

    const client = await getPrinterClient();
    await client.testPrint(binding);

    expect(agentClient().testPrint).toHaveBeenCalledTimes(1);
    expect(qzClient().testPrint).toHaveBeenCalledTimes(1);
    expect(qzClient().testPrint).toHaveBeenCalledWith(binding);
    // The probe ran again before the switch, so the new engine was a real choice.
    expect(agent.probe).toHaveBeenCalledTimes(2);
  });

  it("rethrows when the agent answers again on the same client", async () => {
    const dropped = new PrintAgentError("PRINT_AGENT_CONNECTION_LOST", "The agent dropped us.");
    agentClient().printKitchen.mockRejectedValueOnce(dropped);

    const client = await getPrinterClient();
    const slip = { title: "KITCHEN", lines: [] };

    await expect(client.printKitchen(binding, slip)).rejects.toBe(dropped);
    expect(agentClient().printKitchen).toHaveBeenCalledTimes(1);
    expect(qzClient().printKitchen).not.toHaveBeenCalled();
  });

  it("re-applies the register scope on the engine it fell back to", async () => {
    agentClient().testPrint.mockRejectedValueOnce(
      new PrintAgentError("PRINT_AGENT_UNAVAILABLE", "No agent.")
    );
    agentGoesAwayAfterBoot();

    const client = (await getPrinterClient()) as MockedClient;
    client.configureScope("tenant-1", "register-1");
    expect(agentClient().configureScope).toHaveBeenCalledWith("tenant-1", "register-1");

    await client.testPrint(binding);

    expect(qzClient().configureScope).toHaveBeenCalledWith("tenant-1", "register-1");
  });

  it("does not retry a printer the operator has to fix", async () => {
    const missing = new PrintAgentError("PRINTER_NOT_FOUND", "No printer named POS-80.");
    agentClient().testPrint.mockRejectedValueOnce(missing);

    const client = await getPrinterClient();

    await expect(client.testPrint(binding)).rejects.toBe(missing);
    expect(agentClient().testPrint).toHaveBeenCalledTimes(1);
    expect(qzClient().testPrint).not.toHaveBeenCalled();
    expect(agent.probe).toHaveBeenCalledTimes(1);
  });

  it("prints in the browser on a phone without asking the agent", async () => {
    phone();

    const client = await getPrinterClient();
    await client.findPrinters("USB");

    expect(agent.probe).not.toHaveBeenCalled();
    expect(browserClient().findPrinters).toHaveBeenCalledWith("USB");
    expect(qzClient().findPrinters).not.toHaveBeenCalled();
  });

  it("offers no queue cleanup when the active engine cannot do it", async () => {
    agentGoesAwayAfterBoot();

    const client = (await getPrinterClient()) as MockedClient & { cleanup?: unknown };

    expect(client.cleanup).toBeUndefined();
  });

  it("keeps one client for every caller", async () => {
    const [first, second] = await Promise.all([getPrinterClient(), getPrinterClient()]);

    expect(first).toBe(second);
    expect(agent.probe).toHaveBeenCalledTimes(1);
  });

  it("keeps the agent failure as the cause when the fallback engine also fails", async () => {
    const dropped = new PrintAgentError("PRINT_AGENT_CONNECTION_LOST", "The agent dropped us.");
    agentClient().testPrint.mockRejectedValueOnce(dropped);
    agentGoesAwayAfterBoot();
    qzClient().testPrint.mockRejectedValueOnce(new Error("QZ Tray is not running."));

    const client = await getPrinterClient();

    let caught: unknown;
    try {
      await client.testPrint(binding);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain("QZ Tray is not running.");
    expect((caught as Error).message).toContain("agent connection was lost first");
    expect((caught as Error & { cause?: unknown }).cause).toBe(dropped);
  });
});

