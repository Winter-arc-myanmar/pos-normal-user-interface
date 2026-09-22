import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultPrinterBinding,
  readPrinterBindings,
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
});
