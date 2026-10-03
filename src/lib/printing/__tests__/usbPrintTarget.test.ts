import { describe, expect, it } from "vitest";
import {
  isIgnoredUsbDevice,
  isRetryableUsbQueueError,
  parseUsbDeviceRef,
  rankUsbPrintQueues,
  toQzUsbHex,
  isReceiptUsbPrinter,
  usbDeviceLabel,
  usbDeviceMatchesName,
} from "../usbPrintTarget";

describe("rankUsbPrintQueues", () => {
  it("sends to the new USB queue when the saved queue no longer matches a plugged-in printer", () => {
    expect(
      rankUsbPrintQueues({
        savedName: "POS-80",
        queues: [
          { name: "POS-80", connection: "USB" },
          { name: "XP-80C", connection: "USB" },
        ],
        connectedDevices: [{ product: "XP-80C", manufacturer: "XPrinter" }],
      })
    ).toEqual(["XP-80C", "POS-80"]);
  });

  it("keeps the saved queue when that printer is still plugged in", () => {
    expect(
      rankUsbPrintQueues({
        savedName: "Kitchen POS-80",
        queues: [
          { name: "Kitchen POS-80", connection: "USB" },
          { name: "Counter XP-58", connection: "USB" },
        ],
        connectedDevices: [
          { product: "POS-80", manufacturer: "XPrinter" },
          { product: "XP-58", manufacturer: "XPrinter" },
        ],
      })
    ).toEqual(["Kitchen POS-80", "Counter XP-58"]);
  });

  it("skips an offline saved queue and uses the live USB printer", () => {
    expect(
      rankUsbPrintQueues({
        savedName: "POS-80",
        queues: [
          { name: "POS-80", connection: "USB" },
          { name: "XP-80C", connection: "USB" },
        ],
        offlineNames: ["POS-80"],
        connectedDevices: [{ product: "XP-80C" }],
      })
    ).toEqual(["XP-80C"]);
  });

  it("uses the only live USB queue when the saved printer is gone", () => {
    expect(
      rankUsbPrintQueues({
        savedName: "Old kitchen printer",
        queues: [{ name: "USB Printer", connection: "USB" }],
      })
    ).toEqual(["USB Printer"]);
  });

  it("returns no queues when every USB printer is offline", () => {
    expect(
      rankUsbPrintQueues({
        savedName: "POS-80",
        queues: [{ name: "POS-80", connection: "USB" }],
        offlineNames: ["POS-80"],
      })
    ).toEqual([]);
  });
});

describe("usbDeviceLabel", () => {
  it("labels a plugged-in USB printer even without a Windows queue name", () => {
    expect(
      usbDeviceLabel({
        manufacturer: "XPrinter",
        product: "XP-80C",
        vendorId: "0483",
        productId: "5740",
      })
    ).toBe("XPrinter XP-80C");
    expect(usbDeviceLabel({ vendorId: "0483", productId: "5740" })).toBe(
      "USB 0483:5740"
    );
    expect(isIgnoredUsbDevice({ product: "USB Receiver", manufacturer: "Logitech" })).toBe(
      false
    );
    expect(isIgnoredUsbDevice({ product: "USB Keyboard" })).toBe(true);
    expect(
      isReceiptUsbPrinter({
        vendorId: "1fc9",
        productId: "2016",
        product: "Printer POS-80",
      })
    ).toBe(true);
    expect(
      isReceiptUsbPrinter({
        vendorId: "3277",
        productId: "0029",
        product: "USB2.0 HD UVC WebCam",
      })
    ).toBe(false);
    expect(toQzUsbHex("1f9d")).toBe("0x1F9D");
    expect(parseUsbDeviceRef("USB 1f9d:2016")).toEqual({
      vendorId: "1f9d",
      productId: "2016",
    });
    expect(
      usbDeviceMatchesName({ vendorId: "1F9D", productId: "2016" }, "USB 1f9d:2016")
    ).toBe(true);
  });
});

describe("isRetryableUsbQueueError", () => {
  it("retries after a stale Windows USB queue error", () => {
    expect(isRetryableUsbQueueError('Cannot find printer with name "POS-80"')).toBe(
      true
    );
    expect(isRetryableUsbQueueError("Printer communication failed")).toBe(false);
  });
});
