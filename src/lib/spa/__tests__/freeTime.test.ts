import { describe, expect, it } from "vitest";
import type { RunningPromotion } from "@/core/domain/entities/Promotion";
import { freeTimeFor, freeWithin } from "../freeTime";

const deal = (over: Partial<RunningPromotion> = {}): RunningPromotion => ({
  id: "b1g1",
  name: "1 hour + 1 free",
  discountType: "FREE_TIME",
  discountValue: 0,
  buyUnits: 1,
  freeUnits: 1,
  appliesTo: "ITEMS",
  productGroups: [],
  variantIds: ["ktv-hour"],
  priorityLevel: 0,
  ...over,
});

describe("free time preview", () => {
  it("gives an hour for every hour bought", () => {
    expect(freeTimeFor("ktv-hour", 3, [deal()])).toEqual({ name: "1 hour + 1 free", units: 3 });
  });

  it("gives only for each whole lot bought", () => {
    const twoGetOne = deal({ buyUnits: 2, freeUnits: 1 });
    expect(freeTimeFor("ktv-hour", 1, [twoGetOne])).toBeNull();
    expect(freeTimeFor("ktv-hour", 5, [twoGetOne])?.units).toBe(2);
  });

  it("ignores money promotions and deals for other rentals", () => {
    expect(
      freeTimeFor("ktv-hour", 2, [
        deal({ discountType: "PERCENT_OFF", discountValue: 20 }),
        deal({ variantIds: ["vip-hour"] }),
      ])
    ).toBeNull();
  });

  it("applies the best deal only, priority first", () => {
    const small = deal({ id: "small", name: "2 + 1", buyUnits: 2, freeUnits: 1 });
    expect(freeTimeFor("ktv-hour", 4, [small, deal()])?.units).toBe(4);
    expect(freeTimeFor("ktv-hour", 4, [{ ...small, priorityLevel: 5 }, deal()])?.name).toBe("2 + 1");
  });

  it("covers every rental when the deal applies to everything", () => {
    expect(freeTimeFor("any-hour", 1, [deal({ appliesTo: "ALL_ITEMS", variantIds: [] })])?.units).toBe(1);
  });

  it("covers only the groups a whole-menu deal names", () => {
    const spaOnly = deal({ appliesTo: "ALL_ITEMS", variantIds: [], productGroups: ["SPA_PACKAGE"] });
    expect(freeTimeFor("massage", 1, [spaOnly], "SPA_PACKAGE")?.units).toBe(1);
    expect(freeTimeFor("ktv-hour", 1, [spaOnly], "ROOM_TIME")).toBeNull();
  });

  it("frees units inside time already set", () => {
    const twoGetOne = deal({ appliesTo: "ALL_ITEMS", variantIds: [], buyUnits: 2, freeUnits: 1 });
    expect(freeTimeFor("sauna", 3, [twoGetOne], "ROOM_TIME", "WITHIN")?.units).toBe(1);
    expect(freeTimeFor("sauna", 2, [twoGetOne], "ROOM_TIME", "WITHIN")).toBeNull();
  });
});

describe("freeWithin", () => {
  it("matches the server", () => {
    expect(freeWithin(3, 2, 1)).toBe(1);
    expect(freeWithin(7, 2, 1)).toBe(2);
    expect(freeWithin(2, 1, 2)).toBe(1);
  });
});
