import { beforeEach, describe, expect, it, vi } from "vitest";
import { MedianPrinterClient } from "../MedianPrinterClient";

const plugin = {
  connect: vi.fn(),
  discover: vi.fn(),
  printRaw: vi.fn(),
};

describe("MedianPrinterClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plugin.connect.mockResolvedValue(undefined);
    plugin.discover.mockResolvedValue({
      devices: [{ id: "usb-1", name: "Counter printer" }],
    });
    plugin.printRaw.mockResolvedValue(undefined);
    window.median = { posPrinter: plugin };
  });

  it("discovers stable native printer device IDs", async () => {
    const client = new MedianPrinterClient();

    await expect(client.findPrinters("USB")).resolves.toEqual(["usb-1"]);
    expect(plugin.discover).toHaveBeenCalledWith({ transport: "USB" });
  });

  it("sends ESC/POS bytes through the native bridge", async () => {
    const client = new MedianPrinterClient();

    await client.testPrint({
      id: "network-1",
      transport: "NETWORK",
      displayName: "Kitchen",
      host: "192.168.1.50",
      port: 9100,
      lastVerifiedAt: "",
    });

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
});
