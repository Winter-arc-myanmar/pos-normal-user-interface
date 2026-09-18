import { describe, expect, it } from "vitest";
import {
  isVacantWaitlistTable,
  selectWaitlistTables,
  tableFitsParty,
  tableMatchesPreferredZone,
} from "../waitlistTableMatch";

const zones = [
  { id: "zone-vip", name: "VIP / VIP2 ZONE" },
  { id: "zone-vip-2", name: "VIP2" },
  { id: "zone-patio", name: "Patio" },
];

const tvip1 = {
  id: "tvip-1",
  tableNumber: "TVIP-1",
  zoneId: "zone-vip",
  maxSeats: 4,
  status: "OCCUPIED",
};

const tvip2 = {
  id: "tvip-2",
  tableNumber: "TVIP-2",
  zoneId: "zone-vip-2",
  maxSeats: 6,
  status: "DIRTY",
};

const patio = {
  id: "patio-1",
  tableNumber: "T1",
  zoneId: "zone-patio",
  maxSeats: 8,
  status: "AVAILABLE",
};

describe("waitlistTableMatch", () => {
  it("treats tables without an open session as vacant even if status is stale", () => {
    expect(isVacantWaitlistTable(tvip1, undefined)).toBe(true);
    expect(isVacantWaitlistTable(tvip2, { sessionState: "CLOSED" })).toBe(true);
    expect(
      isVacantWaitlistTable(tvip1, {
        sessionState: "SEATED",
        closedAt: null,
      })
    ).toBe(false);
  });

  it("matches VIP preferred zone by id, name family, or table number", () => {
    expect(tableMatchesPreferredZone(tvip1, "zone-vip", zones)).toBe(true);
    expect(tableMatchesPreferredZone(tvip2, "zone-vip", zones)).toBe(true);
    expect(tableMatchesPreferredZone(patio, "zone-vip", zones)).toBe(false);
  });

  it("does not hide VIP tables when party size exceeds listed seats", () => {
    expect(tableFitsParty(tvip1, 5)).toBe(false);
    expect(tableFitsParty({ ...tvip1, maxSeats: 0 }, 5)).toBe(true);

    const matched = selectWaitlistTables([tvip1, tvip2, patio], {
      getSession: (id) =>
        id === "patio-1"
          ? { sessionState: "ORDERING", closedAt: null }
          : undefined,
      preferredZoneId: "zone-vip",
      zones,
      partySize: 5,
    });

    expect(matched.map((table) => table.tableNumber)).toEqual([
      "TVIP-2",
      "TVIP-1",
    ]);
  });
});
