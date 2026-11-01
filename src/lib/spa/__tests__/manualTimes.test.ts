import { describe, expect, it } from "vitest";
import { SalesOrderLine } from "@/core/domain/entities/Cashier";
import {
  defaultManualTimes,
  fromLocalInput,
  isRoomTimeLine,
  manualTimesBackwards,
  roomTimeNamer,
  slipTimeRange,
  toLocalInput,
} from "../manualTimes";

const at = (hours: number, minutes: number) => new Date(2026, 9, 31, hours, minutes).toISOString();

const line = (id: string, over: Partial<SalesOrderLine> = {}) =>
  new SalesOrderLine({ id, salesOrderId: "o", variantId: id, quantity: "1", unitPrice: "1", ...over });

describe("manual In and Out", () => {
  it("starts In at the room's start and Out when its booked time ends", () => {
    expect(defaultManualTimes({ openedAt: at(16, 15), plannedMinutes: 120 })).toEqual({
      inAt: "2026-10-31T16:15",
      outAt: "2026-10-31T18:15",
    });
  });

  it("starts Out at now for a room with no time booked", () => {
    const now = new Date(at(17, 5)).getTime();
    expect(defaultManualTimes({ openedAt: at(16, 15) }, now).outAt).toBe("2026-10-31T17:05");
  });

  it("goes to and from the time box in the till's own time zone", () => {
    expect(fromLocalInput(toLocalInput(at(16, 15)))).toBe(at(16, 15));
    expect(fromLocalInput("")).toBeUndefined();
  });

  it("refuses an Out before the In", () => {
    expect(manualTimesBackwards({ inAt: "2026-10-31T18:00", outAt: "2026-10-31T16:00" })).toBe(true);
    expect(manualTimesBackwards({ inAt: "2026-10-31T16:00", outAt: "2026-10-31T18:00" })).toBe(false);
  });

  it("writes them as staff did by hand", () => {
    expect(slipTimeRange(at(16, 15), at(18, 15))).toBe("4:15 - 6:15");
    expect(slipTimeRange(at(11, 30), at(12, 5))).toBe("11:30 - 12:05");
    expect(slipTimeRange(at(16, 15), undefined)).toBeUndefined();
  });

  it("puts them beside the first room charge only", () => {
    const lines = [
      line("beer", { categoryName: "Drinks" }),
      line("room", { categoryName: "KTV Rooms", courseType: "Hours · Standard" }),
      line("more", { courseType: "Extension · Standard" }),
    ];
    const name = roomTimeNamer(lines, "4:15 - 6:15");

    expect(lines.map((item) => name(item, item.id))).toEqual(["beer", "room (4:15 - 6:15)", "more"]);
    expect(isRoomTimeLine(lines[2])).toBe(true);
    expect(isRoomTimeLine(lines[0])).toBe(false);
    expect(roomTimeNamer(lines, undefined)(lines[1], "room")).toBe("room");
  });
});
