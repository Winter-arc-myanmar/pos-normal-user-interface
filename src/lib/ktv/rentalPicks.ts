import type { RentalChoice } from "@/lib/spa/freeTime";

/**
 * How many blocks of each rental a party is buying. A rate that is missing or 0
 * is not sold, so a 2 h 30 min booking is the hourly rate twice plus one 30 min
 * block, each rate counted on its own.
 */
export type RentalPicks = Record<string, number>;

export interface RentalBlock {
  rental: RentalChoice;
  units: number;
  minutes: number;
  amount: number;
}

/** One block's price: the room's own rate is quoted at today's price (peak hours). */
export const blockPrice = (
  rental: RentalChoice,
  ownVariantId?: string,
  ownPrice?: number
): number =>
  rental.variantId === ownVariantId && ownPrice !== undefined ? ownPrice : rental.unitPrice;

/** The rates bought, in the order the room lists them, with their time and money. */
export const pickedRentals = (
  rentals: RentalChoice[],
  picks: RentalPicks,
  ownVariantId?: string,
  ownPrice?: number
): RentalBlock[] =>
  rentals
    .map((rental) => ({ rental, units: Math.max(0, Math.floor(picks[rental.variantId] || 0)) }))
    .filter((picked) => picked.units > 0)
    .map(({ rental, units }) => ({
      rental,
      units,
      minutes: units * rental.blockMinutes,
      amount: units * blockPrice(rental, ownVariantId, ownPrice),
    }));

/** The rates a room starts on: its own rate, or the first one, at that rate's minimum. */
export const defaultRentalPicks = (
  rentals: RentalChoice[],
  ownVariantId?: string
): RentalPicks => {
  const first = rentals.find((item) => item.variantId === ownVariantId) || rentals[0];
  return first ? { [first.variantId]: Math.max(1, first.minimumUnits) } : {};
};

/** The picks without one rate, so a rate that is no longer sold leaves no count. */
const withoutRate = (picks: RentalPicks, variantId: string): RentalPicks => {
  const rest = { ...picks };
  delete rest[variantId];
  return rest;
};

/**
 * One more or one fewer block of a rate. The first block of a rate is its own
 * minimum, and taking the last one off stops selling that rate rather than
 * leaving a part lot the till cannot charge for.
 */
export function changeRentalPick(
  picks: RentalPicks,
  rentals: RentalChoice[],
  variantId: string,
  delta: number
): RentalPicks {
  const rental = rentals.find((item) => item.variantId === variantId);
  if (!rental) return picks;
  const units = Math.max(0, Math.floor(picks[variantId] || 0));
  const next = delta > 0 ? (units === 0 ? rental.minimumUnits : units + 1) : units - 1;
  if (next < Math.max(1, rental.minimumUnits)) return withoutRate(picks, variantId);
  return { ...picks, [variantId]: next };
}

/** A tap on a rate sells it at its minimum, or stops selling it. */
export function toggleRentalPick(
  picks: RentalPicks,
  rentals: RentalChoice[],
  variantId: string
): RentalPicks {
  const rental = rentals.find((item) => item.variantId === variantId);
  if (!rental) return picks;
  if ((picks[variantId] || 0) > 0) return withoutRate(picks, variantId);
  return { ...picks, [variantId]: Math.max(1, rental.minimumUnits) };
}

/** The minutes the picked rates buy, before any free time. */
export const pickedMinutes = (blocks: RentalBlock[]): number =>
  blocks.reduce((sum, block) => sum + block.minutes, 0);

/** The money the picked rates cost, before promotions. */
export const pickedAmount = (blocks: RentalBlock[]): number =>
  blocks.reduce((sum, block) => sum + block.amount, 0);
