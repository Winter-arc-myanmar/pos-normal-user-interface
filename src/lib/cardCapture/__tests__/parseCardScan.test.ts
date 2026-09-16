import { describe, expect, it } from "vitest";
import { parseCardScan, parseNfcReading } from "../parseCardScan";

describe("parseCardScan", () => {
  it("normalizes USB reader hex UIDs", () => {
    expect(parseCardScan("04a3b2c1")).toBe("04A3B2C1");
    expect(parseCardScan("  04A3-B2C1  ")).toBe("04A3B2C1");
  });

  it("extracts magstripe track data", () => {
    expect(parseCardScan(";1234567890?")).toBe("1234567890");
    expect(parseCardScan("%B1234567890^TEST?")).toBe("1234567890");
  });

  it("rejects short noise", () => {
    expect(parseCardScan("ab")).toBe("");
    expect(parseCardScan("")).toBe("");
  });
});

describe("parseNfcReading", () => {
  it("prefers the NFC serial number", () => {
    expect(
      parseNfcReading({
        serialNumber: "04:a3:b2:c1",
        message: { records: [] },
      })
    ).toBe("04A3B2C1");
  });

  it("falls back to an NDEF text payload", () => {
    const encoded = new TextEncoder().encode("MC-001");
    expect(
      parseNfcReading({
        message: {
          records: [{ recordType: "text", data: encoded, encoding: "utf-8" }],
        },
      })
    ).toBe("MC-001");
  });
});
