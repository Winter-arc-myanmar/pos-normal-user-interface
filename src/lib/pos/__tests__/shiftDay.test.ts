import { describe, expect, it } from "vitest";
import { dayStatus } from "../shiftDay";

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
