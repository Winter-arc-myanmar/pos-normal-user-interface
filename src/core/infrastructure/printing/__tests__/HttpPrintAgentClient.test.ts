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

describe("HttpPrintAgentClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPrintAgentAvailable.mockReturnValue(true);
  });

  it("sends the ESC/POS bytes with the printer identity", async () => {
    mocks.callPrintAgent.mockResolvedValue(success);
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
    mocks.callPrintAgent.mockResolvedValue({
      ...success,
      rebound: true,
      printer: {
        id: "usbprint:xyz",
        kind: "USB",
        name: "POS-80 (Copy 1)",
        port: "USB002",
        connected: true,
        stale: false,
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
    mocks.callPrintAgent.mockResolvedValue(success);
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

  it("refuses to print when the agent is gone", async () => {
    mocks.isPrintAgentAvailable.mockReturnValue(false);
    const client = new HttpPrintAgentClient();
    await expect(client.connect()).rejects.toThrow(/print agent/i);
  });
});
