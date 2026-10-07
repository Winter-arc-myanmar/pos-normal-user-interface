import type { FreeTimeOffer, RentalChoice } from "./freeTime";

export interface RoomChargeEstimate {
  /** Charged when the room starts, with how many units and what they come to. */
  now: { charge: RentalChoice; units: number; amount: number; free: FreeTimeOffer | null }[];
  /** On a clock: billed for the time used when the bill closes. */
  atEnd: RentalChoice[];
  total: number;
}

/**
 * What a room's charges add when it starts, the way the server works it out: those
 * added by themselves and those ticked. A fixed fee once; a charge paid first for
 * the booked time; a clock at the end, or up front when the shop takes payment
 * each time.
 */
export function estimateRoomCharges(
  charges: RentalChoice[],
  picked: string[],
  booking: { minutes: number; billAtEnd: boolean },
  /** The units of time a running "buy X, get Y free" frees inside these units. */
  freeWithin: (charge: RentalChoice, units: number) => FreeTimeOffer | null = () => null
): RoomChargeEstimate {
  const estimate: RoomChargeEstimate = { now: [], atEnd: [], total: 0 };
  for (const charge of charges) {
    if (!charge.autoApply && !picked.includes(charge.variantId)) continue;
    if (charge.soldBy === "TIME" && charge.chargeMode === "CLOCK" && booking.billAtEnd) {
      estimate.atEnd.push(charge);
      continue;
    }
    const units =
      charge.soldBy === "TIME"
        ? Math.max(charge.minimumUnits, Math.ceil(Math.max(booking.minutes, 1) / charge.blockMinutes))
        : 1;
    const free = charge.soldBy === "TIME" ? freeWithin(charge, units) : null;
    const amount = (units - (free?.units || 0)) * charge.unitPrice;
    estimate.now.push({ charge, units, amount, free });
    estimate.total += amount;
  }
  return estimate;
}
