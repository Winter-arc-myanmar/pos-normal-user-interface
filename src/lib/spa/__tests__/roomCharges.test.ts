import { describe, expect, it } from "vitest";
import type { RentalChoice } from "../freeTime";
import { estimateRoomCharges } from "../roomCharges";

const charge = (over: Partial<RentalChoice>): RentalChoice => ({
  variantId: "v",
  productId: "p",
  name: "Charge",
  unitPrice: 10000,
  blockMinutes: 60,
  minimumUnits: 1,
  soldBy: "EACH",
  chargeMode: null,
  autoApply: false,
  ...over,
});

const vip = charge({ variantId: "vip", name: "VIP room", unitPrice: 15000, autoApply: true });
const sauna = charge({ variantId: "sauna", soldBy: "TIME", chargeMode: "PAY_FIRST", unitPrice: 8000 });
const steam = charge({ variantId: "steam", soldBy: "TIME", chargeMode: "CLOCK", blockMinutes: 30, autoApply: true });

describe("room charge estimate", () => {
  it("adds the automatic fee and a ticked sauna for the booked time", () => {
    const estimate = estimateRoomCharges([vip, sauna], ["sauna"], { minutes: 90, billAtEnd: false });
    expect(estimate.now.map((line) => [line.charge.variantId, line.units, line.amount])).toEqual([
      ["vip", 1, 15000],
      ["sauna", 2, 16000],
    ]);
    expect(estimate.total).toBe(31000);
  });

  it("leaves an unticked optional charge out", () => {
    expect(estimateRoomCharges([sauna], [], { minutes: 90, billAtEnd: false }).total).toBe(0);
  });

  it("bills a clock at the end when the shop takes payment then", () => {
    const estimate = estimateRoomCharges([steam], [], { minutes: 90, billAtEnd: true });
    expect(estimate.atEnd.map((c) => c.variantId)).toEqual(["steam"]);
    expect(estimate.total).toBe(0);
  });

  it("charges a clock up front when the shop takes payment each time", () => {
    const estimate = estimateRoomCharges([steam], [], { minutes: 90, billAtEnd: false });
    expect(estimate.now[0].units).toBe(3);
  });
});
