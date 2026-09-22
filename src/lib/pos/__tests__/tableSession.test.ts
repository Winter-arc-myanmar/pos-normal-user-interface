import { describe, expect, it } from "vitest";
import {
  findOpenTableSession,
  isOccupiedDiningTable,
  isOpenTableSession,
  normalizeDiningTableStatus,
} from "../tableSession";

describe("isOpenTableSession", () => {
  it("treats CLOSED or closedAt as finished", () => {
    expect(isOpenTableSession({ sessionState: "ORDERING" })).toBe(true);
    expect(isOpenTableSession({ sessionState: "CLOSED" })).toBe(false);
    expect(
      isOpenTableSession({
        sessionState: "PAYMENT_PENDING",
        closedAt: "2026-09-21T12:00:00.000Z",
      })
    ).toBe(false);
    expect(isOpenTableSession(null)).toBe(false);
  });

  it("prefers an older open session over a later closed one", () => {
    expect(
      findOpenTableSession(
        [
          {
            tableId: "table-1",
            sessionState: "CLOSED",
            openedAt: "2026-09-21T13:00:00.000Z",
            closedAt: "2026-09-21T13:05:00.000Z",
          },
          {
            tableId: "table-1",
            sessionState: "ORDERING",
            openedAt: "2026-09-21T12:00:00.000Z",
            closedAt: null,
          },
        ],
        "table-1"
      )?.sessionState
    ).toBe("ORDERING");
  });
});

describe("dining table occupancy", () => {
  it("follows the table status instead of a leftover session", () => {
    expect(normalizeDiningTableStatus(" available ")).toBe("AVAILABLE");
    expect(isOccupiedDiningTable("AVAILABLE")).toBe(false);
    expect(isOccupiedDiningTable("occupied")).toBe(true);
    expect(isOccupiedDiningTable(" OCCUPIED ")).toBe(true);
  });
});
