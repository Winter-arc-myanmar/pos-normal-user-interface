import { describe, expect, it } from "vitest";
import { identityForDevice } from "../printerIdentity";

const printers = [
  { name: "POS-80", id: "usbprint:abc", port: "USB002" },
  { name: "Counter", id: "usbprint:def", port: "USB003" },
];

describe("identityForDevice", () => {
  it("matches the Windows queue name exactly, ignoring case", () => {
    expect(identityForDevice(printers, "pos-80")).toEqual({
      hardwareId: "usbprint:abc",
      portName: "USB002",
    });
    expect(identityForDevice(printers, "POS-80")).toEqual({
      hardwareId: "usbprint:abc",
      portName: "USB002",
    });
  });

  it("trims leading and trailing spaces on both sides before matching", () => {
    expect(identityForDevice(printers, "  POS-80  ")).toEqual({
      hardwareId: "usbprint:abc",
      portName: "USB002",
    });
    expect(
      identityForDevice([{ name: "  POS-80  ", id: "usbprint:abc", port: "USB002" }], "POS-80")
    ).toEqual({ hardwareId: "usbprint:abc", portName: "USB002" });
  });

  it("does not partial-match a queue name", () => {
    expect(identityForDevice(printers, "POS-8")).toEqual({});
    expect(
      identityForDevice([{ name: "POS-80", id: "usbprint:abc", port: "USB002" }], "POS-8")
    ).toEqual({});
    expect(
      identityForDevice([{ name: "POS-8", id: "usbprint:abc" }], "POS-80")
    ).toEqual({});
  });

  it("returns an empty identity when nothing matches", () => {
    expect(identityForDevice(printers, "Kitchen printer")).toEqual({});
  });

  it("returns an empty identity for an empty or missing list", () => {
    expect(identityForDevice([], "POS-80")).toEqual({});
    expect(identityForDevice(null, "POS-80")).toEqual({});
    expect(identityForDevice(undefined, "POS-80")).toEqual({});
  });

  it("returns an empty identity when the device name is empty", () => {
    expect(identityForDevice(printers, "")).toEqual({});
    expect(identityForDevice(printers, "   ")).toEqual({});
    expect(identityForDevice(printers, null)).toEqual({});
    expect(identityForDevice(printers, undefined)).toEqual({});
  });

  it("leaves out missing id and port instead of saving blanks", () => {
    expect(identityForDevice([{ name: "POS-80", id: "usbprint:abc" }], "POS-80")).toEqual({
      hardwareId: "usbprint:abc",
      portName: undefined,
    });
    expect(identityForDevice([{ name: "POS-80", port: "USB002", id: "" }], "POS-80")).toEqual({
      hardwareId: undefined,
      portName: "USB002",
    });
    expect(identityForDevice([{ name: "POS-80", id: "", port: "" }], "POS-80")).toEqual({
      hardwareId: undefined,
      portName: undefined,
    });
  });

  it("returns the first entry when duplicate queue names exist", () => {
    expect(
      identityForDevice(
        [
          { name: "POS-80", id: "usbprint:first", port: "USB001" },
          { name: "POS-80", id: "usbprint:second", port: "USB009" },
        ],
        "POS-80"
      )
    ).toEqual({ hardwareId: "usbprint:first", portName: "USB001" });
  });
});
