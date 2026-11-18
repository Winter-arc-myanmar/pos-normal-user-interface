import { describe, expect, it } from "vitest";
import {
  EMPTY_GUEST_DETAILS,
  asksGuestDetails,
  guestDetailRows,
} from "../guestDetails";

const labels = {
  name: "Name",
  location: "Location",
  time: "Time",
  phone: "Phone",
};

describe("guest details on a cashier slip", () => {
  it("asks only for sales the guest collects, takes away or has delivered", () => {
    for (const serviceType of ["TAKE_AWAY", "DELIVERY", "PICK_UP"]) {
      expect(asksGuestDetails(serviceType)).toBe(true);
    }
    expect(asksGuestDetails("take_away")).toBe(true);
    expect(asksGuestDetails("DINE_IN")).toBe(false);
    expect(asksGuestDetails("TABLE")).toBe(false);
    expect(asksGuestDetails(null)).toBe(false);
    expect(asksGuestDetails(undefined)).toBe(false);
  });

  it("prints the rows that were filled in, and leaves blank ones off", () => {
    expect(
      guestDetailRows(
        { ...EMPTY_GUEST_DETAILS, name: " Aung ", phone: "0912345" },
        labels
      )
    ).toEqual([
      { label: "Name", value: "Aung" },
      { label: "Phone", value: "0912345" },
    ]);
    expect(guestDetailRows(EMPTY_GUEST_DETAILS, labels)).toEqual([]);
    expect(guestDetailRows(null, labels)).toEqual([]);
    expect(guestDetailRows(undefined, labels)).toEqual([]);
  });
});