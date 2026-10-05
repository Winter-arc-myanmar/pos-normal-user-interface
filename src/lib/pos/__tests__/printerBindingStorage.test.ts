import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindingsForSector,
  getDefaultPrinterBinding,
  readPrinterBindings,
  removeLocalOnlyPrinterBindings,
  removePrinterBinding,
  resolveBindingsForPlace,
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

  it("selects local bindings by print sector", () => {
    const checkout = {
      id: "checkout-1",
      backendPrinterId: "printer-checkout",
      transport: "USB" as const,
      displayName: "Counter",
      deviceName: "USB Counter",
      sectors: ["CHECKOUT" as const],
      lastVerifiedAt: "2026-10-02T00:00:00.000Z",
    };
    const finance = {
      id: "finance-1",
      backendPrinterId: "printer-finance",
      transport: "NETWORK" as const,
      displayName: "Office",
      host: "192.168.1.80",
      port: 9100,
      sectors: ["FINANCE" as const, "CHECKOUT" as const],
      lastVerifiedAt: "2026-10-02T00:00:00.000Z",
    };

    expect(bindingsForSector([checkout, finance], "CHECKOUT")).toEqual([
      checkout,
      finance,
    ]);
    expect(bindingsForSector([checkout, finance], "FINANCE")).toEqual([finance]);
    expect(bindingsForSector([checkout, finance], "KDS")).toEqual([]);
  });

  it("falls back to the default printer, then the only printer, for a section", () => {
    const counter = {
      id: "printer-1",
      backendPrinterId: "printer-1",
      transport: "NETWORK" as const,
      displayName: "Counter",
      host: "192.168.1.50",
      port: 9100,
      sectors: ["CHECKOUT" as const],
      lastVerifiedAt: "",
    };
    const office = {
      id: "printer-2",
      backendPrinterId: "printer-2",
      transport: "NETWORK" as const,
      displayName: "Office",
      host: "192.168.1.51",
      port: 9100,
      lastVerifiedAt: "",
    };

    // An exact sector match always wins over the default printer.
    expect(resolveBindingsForPlace([counter, office], office, "CHECKOUT")).toEqual([
      counter,
    ]);
    // Nothing bound to the section -> the default printer prints it.
    expect(resolveBindingsForPlace([counter, office], counter, "KDS")).toEqual([
      counter,
    ]);
    // A single-printer venue prints everything, even without sector config.
    expect(resolveBindingsForPlace([office], null, "CHECKOUT")).toEqual([office]);
    // Two printers, no default, no matching sector -> nothing to print to.
    expect(resolveBindingsForPlace([counter, office], null, "KDS")).toEqual([]);
  });

  it("keeps printing when the device denies local storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("localStorage is blocked");
      },
      removeItem: () => undefined,
      clear: () => undefined,
    });

    savePrinterBinding(
      "tenant-blocked",
      "register-blocked",
      {
        id: "blocked-1",
        backendPrinterId: "blocked-1",
        transport: "USB",
        displayName: "Blocked printer",
        deviceName: "USB Printer",
        sectors: ["CHECKOUT"],
        lastVerifiedAt: "",
      },
      true
    );

    expect(
      readPrinterBindings("tenant-blocked", "register-blocked").bindings["blocked-1"]
    ).toMatchObject({ displayName: "Blocked printer" });
    expect(getDefaultPrinterBinding("tenant-blocked", "register-blocked")).toMatchObject(
      { id: "blocked-1" }
    );
  });
});
