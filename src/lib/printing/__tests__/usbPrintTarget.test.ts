import { describe, expect, it } from "vitest";
import {
  isRetryableUsbQueueError,
  rankUsbPrintQueues,
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

describe("isRetryableUsbQueueError", () => {
  it("retries after a stale Windows USB queue error", () => {
    expect(isRetryableUsbQueueError('Cannot find printer with name "POS-80"')).toBe(
      true
    );
    expect(isRetryableUsbQueueError("Printer communication failed")).toBe(false);
  });
});
