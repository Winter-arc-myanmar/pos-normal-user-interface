export type PosType = "SPA" | "KTV" | "BAR";

/** A promotion running now, as the till shows it. The server applies it by itself. */
export interface RunningPromotion {
  id: string;
  name: string;
  /** FREE_TIME gives time, not money off: buy some hours, get more free. */
  discountType: "PERCENT_OFF" | "AMOUNT_OFF" | "FREE_TIME";
  discountValue: number;
  buyUnits: number | null;
  freeUnits: number | null;
  appliesTo: "ALL_ITEMS" | "CATEGORIES" | "ITEMS";
  variantIds: string[];
  priorityLevel: number;
}

/** What promotions take off one item in the cart. */
export interface PromotionDiscount {
  discount: number;
  names: string[];
}
