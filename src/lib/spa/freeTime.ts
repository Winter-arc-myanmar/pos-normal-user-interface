import type { PromotionGroup, RunningPromotion } from "@/core/domain/entities/Promotion";

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
  /** EACH: a fixed fee. TIME: priced per block. */
  soldBy: "EACH" | "TIME";
  /** TIME only: paid up front, or a clock billed when the bill closes. */
  chargeMode: "PAY_FIRST" | "CLOCK" | null;
  /** Added by itself when the place opens. */
  autoApply: boolean;
}

export interface FreeTimeOffer {
  name: string;
  units: number;
}

/**
 * Of time already set (a treatment's room time), the units "buy 2, get 1 free" makes
 * free: the last of every 3, and of a part lot only those past the units bought.
 */
export const freeWithin = (units: number, buy: number, free: number): number =>
  Math.floor(units / (buy + free)) * free + Math.max(0, (units % (buy + free)) - buy);

/**
 * The free units a running "buy X, get Y free" promotion gives, the same way the
 * server works it out: only the best deal applies. ON_TOP adds them to what was
 * bought (KTV hours, SPA packages); WITHIN frees some of time already set (a SPA
 * room charge for the treatment's time). A deal limited to categories is not
 * previewed - the till does not know the category - so the server may still give
 * time the till did not show.
 */
export function freeTimeFor(
  variantId: string,
  units: number,
  promotions: RunningPromotion[],
  group: PromotionGroup = "ROOM_TIME",
  mode: "ON_TOP" | "WITHIN" = "ON_TOP"
): FreeTimeOffer | null {
  const best = promotions
    .filter((deal) => deal.discountType === "FREE_TIME" && deal.buyUnits && deal.freeUnits)
    .filter(
      (deal) =>
        (deal.appliesTo === "ALL_ITEMS" &&
          (!deal.productGroups?.length || deal.productGroups.includes(group))) ||
        (deal.appliesTo === "ITEMS" && deal.variantIds.includes(variantId))
    )
    .map((deal) => ({
      deal,
      units:
        mode === "WITHIN"
          ? freeWithin(units, deal.buyUnits!, deal.freeUnits!)
          : Math.floor(units / deal.buyUnits!) * deal.freeUnits!,
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
