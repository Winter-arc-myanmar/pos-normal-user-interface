import { beforeEach, describe, expect, it, vi } from "vitest";
import { QzTrayClient } from "../QzTrayClient";

const mocks = vi.hoisted(() => ({
  active: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  find: vi.fn(),
  details: vi.fn(),
  startListening: vi.fn(),
  stopListening: vi.fn(),
  getStatus: vi.fn(),
  listDevices: vi.fn(),
  listInterfaces: vi.fn(),
  listEndpoints: vi.fn(),
  claimDevice: vi.fn(),
  sendData: vi.fn(),
  releaseDevice: vi.fn(),
  create: vi.fn(),
  print: vi.fn(),
}));

vi.mock("qz-tray", () => ({
  default: {
    websocket: {
      isActive: () => mocks.active,
      connect: mocks.connect,
      disconnect: mocks.disconnect,
    },
    printers: {
      find: mocks.find,
      details: mocks.details,
      startListening: mocks.startListening,
      stopListening: mocks.stopListening,
      getStatus: mocks.getStatus,
    },
    usb: {
      listDevices: mocks.listDevices,
      listInterfaces: mocks.listInterfaces,
      listEndpoints: mocks.listEndpoints,
      claimDevice: mocks.claimDevice,
      sendData: mocks.sendData,
      releaseDevice: mocks.releaseDevice,
    },
    configs: { create: mocks.create },
    print: mocks.print,
  },
}));

const usbBinding = {
  id: "usb-1",
  transport: "USB" as const,
  displayName: "Kitchen",
  deviceName: "POS-80",
  lastVerifiedAt: "",
};

describe("QzTrayClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.active = false;
    mocks.connect.mockResolvedValue(undefined);
    mocks.find.mockResolvedValue(["Kitchen USB"]);
    mocks.details.mockRejectedValue(new Error("no details"));
    mocks.startListening.mockResolvedValue(undefined);
    mocks.stopListening.mockResolvedValue(undefined);
    mocks.getStatus.mockResolvedValue([]);
    mocks.listDevices.mockRejectedValue(new Error("no usb"));
    mocks.listInterfaces.mockResolvedValue([]);
    mocks.listEndpoints.mockResolvedValue([]);
    mocks.claimDevice.mockResolvedValue(undefined);
    mocks.sendData.mockResolvedValue(undefined);
    mocks.releaseDevice.mockResolvedValue(undefined);
    mocks.create.mockImplementation((printer: unknown) => ({ printer }));
    mocks.print.mockResolvedValue(undefined);
  });

  it("keeps a blocked-site error instead of saying QZ Tray is stopped", async () => {
    mocks.connect.mockRejectedValue(new Error("Connection blocked by user"));
    const client = new QzTrayClient();

    await expect(client.connect()).rejects.toThrow(/Click Allow/);
  });

  it("discovers installed printer queues", async () => {
    const client = new QzTrayClient();

    await expect(client.findPrinters()).resolves.toEqual(["Kitchen USB"]);
    expect(mocks.connect).toHaveBeenCalled();
  });

  it("discovers a plugged-in USB printer that has no Windows queue yet", async () => {
    mocks.listDevices.mockResolvedValue([
      { vendorId: "0483", productId: "5740", product: "XP-80C", manufacturer: "XPrinter" },
      { vendorId: "046d", productId: "c534", product: "USB Keyboard" },
    ]);
    mocks.details.mockResolvedValue([{ name: "Microsoft Print to PDF", connection: "FILE" }]);
    mocks.find.mockResolvedValue(["Microsoft Print to PDF"]);
    const client = new QzTrayClient();

    await expect(client.findPrinters("USB")).resolves.toEqual(["XPrinter XP-80C"]);
  });

  it("lists only an online Windows USB receipt queue", async () => {
    mocks.details.mockResolvedValue([{ name: "POS-80", connection: "USB" }]);
    const client = new QzTrayClient();

    await expect(client.findPrinters("USB")).resolves.toEqual(["POS-80"]);
  });

  it("does not list webcams or other USB gadgets as printers", async () => {
    mocks.listDevices.mockResolvedValue([
      { vendorId: "3277", productId: "0029", product: "USB2.0 HD UVC WebCam" },
      { vendorId: "13d3", productId: "3571", product: "Realtek Bluetooth Adapter" },
    ]);
    mocks.details.mockResolvedValue([]);
    mocks.find.mockResolvedValue(["Microsoft Print to PDF"]);
    const client = new QzTrayClient();

    await expect(client.findPrinters("USB")).rejects.toThrow(/plugged in/i);
  });

  it("sends a raw ESC/POS network test print", async () => {
    const client = new QzTrayClient();

    await client.testPrint({
      id: "network-1",
      transport: "NETWORK",
      displayName: "Hot Line",
      host: "192.168.1.50",
      port: 9100,
      lastVerifiedAt: "",
    });

    expect(mocks.create).toHaveBeenCalledWith({
      host: "192.168.1.50",
      port: 9100,
    });
    expect(mocks.print).toHaveBeenCalledWith(
      { printer: { host: "192.168.1.50", port: 9100 } },
      [expect.objectContaining({ type: "raw", format: "command" })]
    );
  });

  it("sends a replaced USB printer to the plugged-in queue instead of the old one", async () => {
    mocks.listDevices.mockResolvedValue([
      { vendorId: "0483", productId: "5740", product: "XP-80C", manufacturer: "XPrinter" },
    ]);
    mocks.details.mockResolvedValue([
      { name: "POS-80", connection: "USB" },
      { name: "XP-80C", connection: "USB" },
    ]);
    const client = new QzTrayClient();

    await client.testPrint(usbBinding);

    expect(mocks.create).toHaveBeenCalledWith("POS-80");
    expect(mocks.print).toHaveBeenCalledTimes(1);
  });

  it("retries the live USB queue when the saved Windows queue errors", async () => {
    mocks.details.mockResolvedValue([
      { name: "POS-80", connection: "USB" },
      { name: "XP-80C", connection: "USB" },
    ]);
    mocks.print.mockImplementation(async (config: { printer?: string }) => {
      if (config.printer === "POS-80") {
        throw new Error('Cannot find printer with name "POS-80"');
      }
    });
    const client = new QzTrayClient();

    await client.testPrint(usbBinding);

    expect(mocks.create).toHaveBeenCalledWith("POS-80");
    expect(mocks.create).toHaveBeenCalledWith("XP-80C");
    expect(mocks.print).toHaveBeenCalledTimes(2);
  });

  it("identifies a KDS printer queue that is no longer installed", async () => {
    mocks.print.mockRejectedValue(
      new Error('Cannot find printer with name "Old kitchen printer"')
    );
    const client = new QzTrayClient();

    await expect(
      client.testPrint({
        id: "usb-1",
        transport: "USB",
        displayName: "Kitchen",
        deviceName: "Old kitchen printer",
        lastVerifiedAt: "",
      })
    ).rejects.toThrow(/could not be opened/i);
  });

  it("prints through the Windows POS-80 queue when a raw USB id cannot be claimed", async () => {
    mocks.find.mockResolvedValue(["POS-80"]);
    mocks.details.mockResolvedValue([]);
    const client = new QzTrayClient();

    await client.testPrint({
      id: "usb-vid",
      transport: "USB",
      displayName: "ffff",
      deviceName: "USB 1f9d:2016",
      lastVerifiedAt: "",
    });

    expect(mocks.create).toHaveBeenCalledWith("POS-80");
    expect(mocks.print).toHaveBeenCalled();
  });

  it("sends a test print to a USB device selected by vendor and product id", async () => {
    mocks.listDevices.mockResolvedValue([
      { vendorId: "1f9d", productId: "2016" },
      { vendorId: "1d3d", productId: "3571" },
    ]);
    mocks.listInterfaces.mockResolvedValue(["00"]);
    mocks.listEndpoints.mockResolvedValue(["01"]);
    const client = new QzTrayClient();

    await client.testPrint({
      id: "usb-vid",
      transport: "USB",
      displayName: "ddodd",
      deviceName: "USB 1f9d:2016",
      lastVerifiedAt: "",
    });

    expect(mocks.listInterfaces).toHaveBeenCalledWith({
      vendorId: "0x1F9D",
      productId: "0x2016",
    });
    expect(mocks.claimDevice).toHaveBeenCalledWith({
      vendorId: "0x1F9D",
      productId: "0x2016",
      interface: "0x00",
    });
    expect(mocks.sendData).toHaveBeenCalled();
    expect(mocks.print).not.toHaveBeenCalled();
  });
});
