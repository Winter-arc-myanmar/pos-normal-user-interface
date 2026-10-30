export type PriceNote = "discount" | "changed";

/** How a bill line's price differs from the menu's: lower is a discount, higher a changed price. */
export function linePriceNote(
  unitPrice: string | number | undefined,
  menuPrice: number | undefined
): PriceNote | undefined {
  if (menuPrice === undefined) return undefined;
  const price = Number(unitPrice || 0);
  if (Math.abs(menuPrice - price) < 0.0001) return undefined;
  return price < menuPrice ? "discount" : "changed";
}
