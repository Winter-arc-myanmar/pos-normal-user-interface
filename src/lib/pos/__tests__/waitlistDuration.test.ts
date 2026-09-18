import { describe, expect, it } from "vitest";
import {
  formatWaitDuration,
  isStaleWaitlistEntry,
  waitlistElapsedMinutes,
} from "../waitlistDuration";

describe("waitlistDuration", () => {
  it("formats minutes into hours and days", () => {
    expect(formatWaitDuration(12)).toBe("12m");
    expect(formatWaitDuration(90)).toBe("1h 30m");
    expect(formatWaitDuration(12407)).toBe("8d 14h");
  });

  it("stops wait time when a party is seated", () => {
    expect(
      waitlistElapsedMinutes(
        {
          joinedAt: "2026-09-18T10:00:00.000Z",
          seatedAt: "2026-09-18T10:25:00.000Z",
          status: "SEATED",
        },
        Date.parse("2026-09-18T18:00:00.000Z")
      )
    ).toBe(25);
  });

  it("treats long-waiting active guests as stale", () => {
    expect(
      isStaleWaitlistEntry(
        {
          joinedAt: "2026-09-10T00:00:00.000Z",
          status: "WAITING",
        },
        Date.parse("2026-09-18T00:00:00.000Z")
      )
    ).toBe(true);
    expect(
      isStaleWaitlistEntry(
        {
          joinedAt: "2026-09-18T17:50:00.000Z",
          status: "WAITING",
        },
        Date.parse("2026-09-18T18:00:00.000Z")
      )
    ).toBe(false);
  });
});
