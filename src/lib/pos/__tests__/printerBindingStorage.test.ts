import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultPrinterBinding,
  readPrinterBindings,
  removeLocalOnlyPrinterBindings,
  removePrinterBinding,
  savePrinterBinding,
} from "../printerBindingStorage";

describe("printer binding storage", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });
  });

  it("persists and selects a default workstation printer", () => {
    const binding = {
      id: "printer-1",
      backendPrinterId: "printer-1",
      transport: "NETWORK" as const,
      displayName: "Kitchen",
      host: "192.168.1.50",
      port: 9100,
      lastVerifiedAt: "2026-09-22T00:00:00.000Z",
    };

    savePrinterBinding("tenant-1", "register-1", binding, true);

    expect(
      getDefaultPrinterBinding("tenant-1", "register-1")
    ).toMatchObject(binding);
    expect(
      Object.keys(readPrinterBindings("tenant-1", "register-1").bindings)
    ).toEqual(["printer-1"]);
  });

  it("removes the local binding", () => {
    savePrinterBinding(
      "tenant-1",
      "register-1",
      {
        id: "usb-1",
        transport: "USB",
        displayName: "USB Kitchen",
        deviceName: "USB Printer",
        lastVerifiedAt: "2026-09-22T00:00:00.000Z",
      },
      true
    );

    removePrinterBinding("tenant-1", "register-1", "usb-1");

    expect(getDefaultPrinterBinding("tenant-1", "register-1")).toBeNull();
  });

  it("drops printers that were stored only on this device", () => {
    savePrinterBinding(
      "tenant-1",
      "register-1",
      {
        id: "usb-1",
        transport: "USB",
        displayName: "USB Kitchen",
        deviceName: "USB Printer",
        lastVerifiedAt: "2026-09-22T00:00:00.000Z",
      },
      true
    );
    savePrinterBinding("tenant-1", "register-1", {
      id: "net-1",
      backendPrinterId: "printer-1",
      transport: "NETWORK",
      displayName: "Bar",
      host: "192.168.0.20",
      port: 9100,
      lastVerifiedAt: "2026-09-22T00:00:00.000Z",
    });

    removeLocalOnlyPrinterBindings("tenant-1", "register-1");

    expect(
      Object.keys(readPrinterBindings("tenant-1", "register-1").bindings)
    ).toEqual(["net-1"]);
  });

  it("drops legacy local station assignments in favor of backend routing", () => {
    const values = new Map<string, string>();
    values.set(
      "pos:printerBindings:tenant-1:register-1",
      JSON.stringify({
        version: 1,
        bindings: {
          "old-printer": {
            id: "old-printer",
            transport: "USB",
            displayName: "Old kitchen printer",
            deviceName: "Old kitchen printer",
            stationId: "kitchen",
            lastVerifiedAt: "",
          },
        },
      })
    );
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });

    expect(
      readPrinterBindings("tenant-1", "register-1").bindings["old-printer"]
    ).not.toHaveProperty("stationId");
  });
});
