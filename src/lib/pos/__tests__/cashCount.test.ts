import { describe, expect, it } from "vitest";
import { cashDifference, countTotal, dayStatus, findCashMethod } from "../cashCount";

describe("cash count", () => {
  it("adds up the notes counted", () => {
    expect(countTotal({ 10000: 3, 5000: 1, 1000: 4, 50: 2 })).toBe(39100);
  });

  it("ignores blanks, negatives and part notes", () => {
    expect(countTotal({ 10000: -2, 1000: 1.7 })).toBe(1000);
  });

  it("says short below zero and over above it", () => {
    expect(cashDifference(95000, 100000)).toBe(-5000);
    expect(cashDifference(100500, 100000)).toBe(500);
    expect(cashDifference(100000, 100000)).toBe(0);
  });
});

describe("room board day", () => {
  const due = "2026-10-08T12:00:00Z";
  const at = (iso: string) => new Date(iso).getTime();

  it("has no day on a cashier till", () => {
    expect(dayStatus(null, at(due))).toBe("none");
  });

  it("warns in the last hour and stops once it is over", () => {
    expect(dayStatus(due, at("2026-10-08T10:30:00Z"))).toBe("ok");
    expect(dayStatus(due, at("2026-10-08T11:15:00Z"))).toBe("ending");
    expect(dayStatus(due, at("2026-10-08T12:00:00Z"))).toBe("over");
  });
});

describe("cash method", () => {
  it("picks the active cash tender", () => {
    expect(
      findCashMethod([
        { id: "card", kind: "CARD" },
        { id: "old", kind: "CASH", isActive: false },
        { id: "cash", kind: "CASH" },
      ])?.id
    ).toBe("cash");
  });
});
