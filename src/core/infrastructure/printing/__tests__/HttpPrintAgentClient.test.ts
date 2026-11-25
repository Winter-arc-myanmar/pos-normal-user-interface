import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callPrintAgent: vi.fn(),
  isPrintAgentAvailable: vi.fn(() => true),
  savePrinterBinding: vi.fn(),
}));

vi.mock("@/lib/printing/printAgent", () => ({
  callPrintAgent: mocks.callPrintAgent,
  isPrintAgentAvailable: mocks.isPrintAgentAvailable,
  PRINT_AGENT_UNAVAILABLE: "The print agent is not running.",
}));

vi.mock("@/lib/pos/printerBindingStorage", () => ({
  savePrinterBinding: mocks.savePrinterBinding,
}));

import type { AgentPrinter } from "@/lib/printing/printAgent";
import {
  HttpPrintAgentClient,
  rankAgentPrinterNames,
} from "../HttpPrintAgentClient";

const binding = {
  id: "binding-1",
  transport: "USB" as const,
  displayName: "POS-80",
  deviceName: "POS-80",
  hardwareId: "usbprint:abc",
  lastVerifiedAt: "",
};

const success = {
  success: true,
  bytesWritten: 12,
  via: "spooler",
  durationMs: 3,
  rebound: false,
};

const printerDevice = (overrides: Partial<AgentPrinter> = {}): AgentPrinter => ({
  id: "usbprint:abc",
  kind: "USB",
  name: "POS-80",
  port: "USB002",
  connected: true,
  stale: false,
  ...overrides,
});

/**
 * Routes the mocked agent call by endpoint: listing answers on /v1/printers,
 * everything else gets the print report. Omit `printers` to model a payload
 * without the field (or a printer-less agent).
 */
const mockAgent = ({
  printers,
  print = success,
}: { printers?: AgentPrinter[]; print?: unknown } = {}) => {
  mocks.callPrintAgent.mockImplementation(async (path: string) =>
    path.startsWith("/v1/printers") ? (printers ? { printers } : {}) : print
  );
};

describe("HttpPrintAgentClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPrintAgentAvailable.mockReturnValue(true);
  });

  it("sends the ESC/POS bytes with the printer identity", async () => {
    mockAgent();
    const client = new HttpPrintAgentClient();
    await client.connect();
    await client.testPrint(binding);

    expect(mocks.callPrintAgent).toHaveBeenCalledWith(
      "/v1/print",
      expect.objectContaining({
        transport: "USB",
        printerId: "usbprint:abc",
        deviceId: "POS-80",
        encoding: "base64",
      }),
      expect.objectContaining({ timeoutMs: 20000 })
    );
  });

  it("saves the queue name Windows chose after a rebind", async () => {
    mockAgent({
      print: {
        ...success,
        rebound: true,
        printer: printerDevice({
          id: "usbprint:xyz",
          name: "POS-80 (Copy 1)",
          port: "USB002",
        }),
      },
    });

    const client = new HttpPrintAgentClient();
    client.configureScope("tenant-1", "register-1");
    await client.testPrint(binding);

    expect(mocks.savePrinterBinding).toHaveBeenCalledWith(
      "tenant-1",
      "register-1",
      expect.objectContaining({
        deviceName: "POS-80 (Copy 1)",
        hardwareId: "usbprint:xyz",
        portName: "USB002",
      })
    );
  });

  it("does not touch storage when nothing was rebound", async () => {
    mockAgent();
    const client = new HttpPrintAgentClient();
    client.configureScope("tenant-1", "register-1");
    await client.testPrint(binding);

    expect(mocks.savePrinterBinding).not.toHaveBeenCalled();
  });

  it("lists every queue, receipt-looking ones first", () => {
    const names = rankAgentPrinterNames([
      {
        id: "c",
        kind: "USB",
        name: "Old printer",
        connected: false,
        stale: true,
      },
      {
        id: "a",
        kind: "USB",
        name: "Counter",
        connected: true,
        stale: false,
      },
      {
        id: "b",
        kind: "USB",
        name: "POS-80",
        connected: true,
        stale: false,
      },
    ]);

    expect(names).toEqual(["POS-80", "Counter", "Old printer"]);
  });

  it("lists raw printer devices for a transport, stale queues included", async () => {
    const devices = [
      printerDevice({ id: "usbprint:abc", name: "POS-80", port: "USB002" }),
      printerDevice({
        id: "usbprint:old",
        name: "Old printer",
        port: "USB009",
        connected: false,
        stale: true,
      }),
    ];
    mockAgent({ printers: devices });

    const result = await new HttpPrintAgentClient().listPrinterDevices("USB");

    expect(mocks.callPrintAgent).toHaveBeenCalledWith("/v1/printers?transport=USB");
    expect(mocks.callPrintAgent).toHaveBeenCalledTimes(1);
    expect(result).toEqual(devices);
    expect(result[1].stale).toBe(true);
  });

  it("encodes the transport in the listing query", async () => {
    mockAgent({ printers: [printerDevice({ id: "bt:1", kind: "BLUETOOTH", name: "BT-58" })] });

    await new HttpPrintAgentClient().listPrinterDevices("BLUETOOTH");

    expect(mocks.callPrintAgent).toHaveBeenCalledWith(
      "/v1/printers?transport=BLUETOOTH"
    );
  });

  it("returns no devices when the payload carries no printers", async () => {
    mockAgent();

    await expect(new HttpPrintAgentClient().listPrinterDevices("USB")).resolves.toEqual(
      []
    );
  });

  it("does not ask the agent for devices without a transport", async () => {
    mockAgent();

    await expect(new HttpPrintAgentClient().listPrinterDevices()).resolves.toEqual([]);
    expect(mocks.callPrintAgent).not.toHaveBeenCalled();
  });

  it("ranks USB queue names from the same single listing", async () => {
    mockAgent({
      printers: [
        printerDevice({ id: "c", name: "Old printer", connected: false, stale: true }),
        printerDevice({ id: "a", name: "Counter" }),
        printerDevice({ id: "b", name: "POS-80" }),
      ],
    });

    const names = await new HttpPrintAgentClient().findPrinters("USB");

    expect(names).toEqual(["POS-80", "Counter", "Old printer"]);
    expect(mocks.callPrintAgent).toHaveBeenCalledTimes(1);
    expect(mocks.callPrintAgent).toHaveBeenCalledWith("/v1/printers?transport=USB");
  });

  it("returns plain agent order names for BLUETOOTH and NETWORK", async () => {
    mockAgent({
      printers: [
        printerDevice({ id: "bt:1", kind: "BLUETOOTH", name: "POS-80", stale: true }),
        printerDevice({ id: "bt:2", kind: "BLUETOOTH", name: "Alpha" }),
      ],
    });

    const client = new HttpPrintAgentClient();
    await expect(client.findPrinters("BLUETOOTH")).resolves.toEqual(["POS-80", "Alpha"]);

    mockAgent({
      printers: [
        printerDevice({ id: "net:1", kind: "NETWORK", name: "Kitchen", port: "9100" }),
      ],
    });
    await expect(client.findPrinters("NETWORK")).resolves.toEqual(["Kitchen"]);
  });

  it("refuses to print when the agent is gone", async () => {
    mocks.isPrintAgentAvailable.mockReturnValue(false);
    const client = new HttpPrintAgentClient();
    await expect(client.connect()).rejects.toThrow(/print agent/i);
  });
});
