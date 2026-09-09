import { describe, expect, it } from "vitest";
import { getTableWarningStatus } from "@/lib/pos/tableWarning";

describe("tableWarning", () => {
  const openedAt = "2026-09-09T10:00:00.000Z";
  const now = Date.parse("2026-09-09T11:00:00.000Z");

  it("returns elapsed time and warning levels from occupancy duration", () => {
    expect(getTableWarningStatus(openedAt, now)).toMatchObject({
      level: "WARNING",
      elapsedMinutes: 60,
      elapsedLabel: "01:00",
    });
    expect(
      getTableWarningStatus(openedAt, Date.parse("2026-09-09T11:30:00.000Z"))
    ).toMatchObject({
      level: "CRITICAL",
      elapsedLabel: "01:30",
    });
    expect(
      getTableWarningStatus(openedAt, Date.parse("2026-09-09T10:20:00.000Z"))
    ).toMatchObject({
      level: "OK",
      elapsedLabel: "00:20",
    });
  });

  it("returns null when a table has no open session time", () => {
    expect(getTableWarningStatus(undefined, now)).toBeNull();
  });
});
