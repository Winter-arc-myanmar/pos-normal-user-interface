import type { RunningPromotion } from "@/core/domain/entities/Promotion";

/** A rental the till can sell, and how its time is counted. */
export interface RentalChoice {
  variantId: string;
  productId: string;
  name: string;
  /** Price of one unit at the catalogue rate; the server applies peak hours. */
  unitPrice: number;
  /** Minutes one unit buys (60 = per hour). */
  blockMinutes: number;
  minimumUnits: number;
}

export interface FreeTimeOffer {
  name: string;
  units: number;
}

/**
 * The free units a running "buy X, get Y free" promotion would add to this many
 * units of a rental, the same way the server works it out: only the best deal
 * applies. A deal limited to categories is not previewed - the till does not know
 * the rental's category - so the server may still add time the till did not show.
 */
export function freeTimeFor(
  variantId: string,
  units: number,
  promotions: RunningPromotion[]
): FreeTimeOffer | null {
  const best = promotions
    .filter((deal) => deal.discountType === "FREE_TIME" && deal.buyUnits && deal.freeUnits)
    .filter(
      (deal) =>
        deal.appliesTo === "ALL_ITEMS" ||
        (deal.appliesTo === "ITEMS" && deal.variantIds.includes(variantId))
    )
    .map((deal) => ({
      deal,
      units: Math.floor(units / deal.buyUnits!) * deal.freeUnits!,
    }))
    .filter((offer) => offer.units > 0)
    .sort(
      (a, b) =>
        b.deal.priorityLevel - a.deal.priorityLevel ||
        b.units - a.units ||
        a.deal.id.localeCompare(b.deal.id)
    )[0];
  return best ? { name: best.deal.name, units: best.units } : null;
}
