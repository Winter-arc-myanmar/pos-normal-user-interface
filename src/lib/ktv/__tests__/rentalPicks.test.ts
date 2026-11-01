import { describe, expect, it } from "vitest";
import type { RentalChoice } from "@/lib/spa/freeTime";
import {
  blockPrice,
  changeRentalPick,
  defaultRentalPicks,
  pickedAmount,
  pickedMinutes,
  pickedRentals,
  toggleRentalPick,
} from "../rentalPicks";

const rental = (over: Partial<RentalChoice>): RentalChoice => ({
  variantId: "variant-hour",
  productId: "product-hour",
  name: "KTV room 104",
  unitPrice: 40000,
  blockMinutes: 60,
  minimumUnits: 1,
  soldBy: "TIME",
  chargeMode: "PAY_FIRST",
  autoApply: false,
  ...over,
});

const hourly = rental({});
const halfHour = rental({
  variantId: "variant-half",
  productId: "product-half",
  name: "KTV 30 min",
  unitPrice: 20000,
  blockMinutes: 30,
});
const rentals = [hourly, halfHour];

describe("rentalPicks", () => {
  it("quotes the room's own rate at the room's price now", () => {
    expect(blockPrice(hourly, "variant-half", 45000)).toBe(40000);
    expect(blockPrice(halfHour, "variant-hour", 45000)).toBe(20000);
    expect(blockPrice(hourly, "variant-hour", 45000)).toBe(45000);
  });

  it("books 2 hours and a 30 min block as one 150 min party", () => {
    const blocks = pickedRentals(rentals, { "variant-hour": 2, "variant-half": 1 });

    expect(blocks).toHaveLength(2);
    expect(pickedMinutes(blocks)).toBe(150);
    expect(pickedAmount(blocks)).toBe(100000);
    expect(blocks.map((block) => block.units)).toEqual([2, 1]);
  });

  it("leaves out the rates the cashier did not pick", () => {
    expect(pickedRentals(rentals, { "variant-hour": 2 })).toHaveLength(1);
    expect(pickedRentals(rentals, {})).toEqual([]);
    expect(pickedRentals(rentals, { "variant-half": 0 })).toEqual([]);
  });

  it("starts a room on its own rate at that rate's minimum", () => {
    expect(defaultRentalPicks(rentals, "variant-half")).toEqual({ "variant-half": 1 });
    expect(defaultRentalPicks([rental({ minimumUnits: 2 })])).toEqual({ "variant-hour": 2 });
    expect(defaultRentalPicks([])).toEqual({});
  });

  it("adds a rate at its minimum, then one block at a time", () => {
    const picked = changeRentalPick({}, rentals, "variant-half", 1);
    expect(picked).toEqual({ "variant-half": 1 });
    expect(changeRentalPick(picked, rentals, "variant-half", 1)).toEqual({ "variant-half": 2 });
  });

  it("stops selling a rate when its last block comes off", () => {
    expect(changeRentalPick({ "variant-hour": 3 }, rentals, "variant-hour", -1)).toEqual({
      "variant-hour": 2,
    });
    expect(changeRentalPick({ "variant-hour": 1 }, rentals, "variant-hour", -1)).toEqual({});
    expect(changeRentalPick({}, rentals, "variant-hour", -1)).toEqual({});
  });

  it("keeps a rate at its own minimum, even when that is more than one block", () => {
    const vip = rental({ variantId: "variant-vip", minimumUnits: 2 });
    expect(changeRentalPick({}, [vip], "variant-vip", 1)).toEqual({ "variant-vip": 2 });
    expect(changeRentalPick({ "variant-vip": 3 }, [vip], "variant-vip", -1)).toEqual({
      "variant-vip": 2,
    });
    expect(changeRentalPick({ "variant-vip": 2 }, [vip], "variant-vip", -1)).toEqual({});
  });

  it("toggles a rate on and off without touching the others", () => {
    expect(toggleRentalPick({ "variant-hour": 2 }, rentals, "variant-half")).toEqual({
      "variant-hour": 2,
      "variant-half": 1,
    });
    expect(toggleRentalPick({ "variant-hour": 2, "variant-half": 1 }, rentals, "variant-half")).toEqual({
      "variant-hour": 2,
    });
  });
});
