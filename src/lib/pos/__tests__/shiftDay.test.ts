import { describe, expect, it } from "vitest";
import { dayStatus, usableShiftId } from "../shiftDay";

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

describe("usable shift", () => {
  const open = (cashierId: string) => ({
    id: "shift-1",
    openedAt: "2026-10-24T02:00:00Z",
    openingCashFloat: 0,
    cashierId,
    cashierName: null,
  });

  it("is none once the shift is closed", () => {
    expect(usableShiftId({ shiftRule: "PER_LOGIN", shift: null }, "me")).toBe("");
    expect(usableShiftId(null, "me")).toBe("");
  });

  it("is only your own on a per-login till", () => {
    expect(usableShiftId({ shiftRule: "PER_LOGIN", shift: open("me") }, "me")).toBe("shift-1");
    expect(usableShiftId({ shiftRule: "PER_LOGIN", shift: open("other") }, "me")).toBe("");
  });

  it("is shared on a daily till", () => {
    expect(usableShiftId({ shiftRule: "DAILY", shift: open("other") }, "me")).toBe("shift-1");
  });
});
