import { describe, expect, it } from "vitest";
import { clockSoFar } from "@/lib/pos/tableCharges";

const pool = {
  variantId: "variant-pool",
  name: "Pool table",
  unitPrice: 3000,
  soldBy: "TIME" as const,
  timeBlockMinutes: 30,
  minimumBlocks: 1,
  chargeMode: "CLOCK" as const,
  autoApply: false,
};

describe("clock so far", () => {
  const start = "2026-10-07T12:00:00Z";
  const at = (minutes: number) => new Date(start).getTime() + minutes * 60_000;

  it("charges whole blocks, rounding up, like the server", () => {
    expect(clockSoFar(pool, start, at(45))).toBe(6000);
    expect(clockSoFar(pool, start, at(61))).toBe(9000);
  });

  it("charges at least the minimum", () => {
    expect(clockSoFar({ ...pool, minimumBlocks: 2 }, start, at(5))).toBe(6000);
  });

  it("shows nothing when the charge is no longer offered", () => {
    expect(clockSoFar(undefined, start, at(45))).toBeNull();
  });
});
