import { describe, expect, it } from "vitest";
import { formatMinutesLeft, hostessStatusRows } from "../hostessStatus";

const now = new Date("2026-10-31T21:00:00Z").getTime();
const at = (minutes: number) => new Date(now + minutes * 60000).toISOString();

describe("hostessStatusRows", () => {
  it("puts the soonest to finish first, then until close, then free", () => {
    const rows = hostessStatusRows(
      [
        { id: "lily", name: "Lily", nickname: null, inRoom: null },
        { id: "may", name: "May", nickname: null, inRoom: { roomNumber: "V03", until: null } },
        { id: "snow", name: "Ma Hnin", nickname: "Snow", inRoom: { roomNumber: "V03", until: at(42) } },
        { id: "rose", name: "Ma Thiri", nickname: "Rose", inRoom: { roomNumber: "V05", until: at(4) } },
      ],
      now
    );
    expect(rows.map((row) => [row.name, row.minutesLeft, row.tone])).toEqual([
      ["Rose", 4, "soon"],
      ["Snow", 42, "ok"],
      ["May", undefined, "ok"],
      ["Lily", undefined, "ok"],
    ]);
    expect(rows[3].inRoom).toBe(false);
  });

  it("marks time that has run out", () => {
    const [row] = hostessStatusRows(
      [{ id: "snow", name: "Snow", nickname: null, inRoom: { roomNumber: "V01", until: at(-1) } }],
      now
    );
    expect(row.tone).toBe("over");
  });

  it("writes minutes as hours and minutes", () => {
    expect(formatMinutesLeft(42)).toBe("0:42");
    expect(formatMinutesLeft(65)).toBe("1:05");
    expect(formatMinutesLeft(-3)).toBe("0:00");
  });
});
