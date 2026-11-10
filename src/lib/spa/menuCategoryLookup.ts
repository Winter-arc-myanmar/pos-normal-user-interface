import type { Product } from "@/core/domain/entities/Cashier";

/**
 * Product name to menu category, for the room orders whose items arrive without
 * one.
 *
 * The API's room-order view names each item after its product but carries no
 * category, and the KDS station that prints a ticket is chosen by that category.
 * A name sold under two categories cannot say which station prints it, so those
 * are left out and the item is reported instead of printed in the wrong place.
 */
export function categoryByProductName(products: Product[]): Map<string, string> {
  const byName = new Map<string, string>();
  const ambiguous = new Set<string>();

  for (const product of products) {
    const name = product.name?.trim().toLowerCase();
    const categoryId = product.categoryId;
    if (!name || !categoryId) continue;
    const seen = byName.get(name);
    if (seen && seen !== categoryId) ambiguous.add(name);
    else byName.set(name, categoryId);
  }

  for (const name of ambiguous) byName.delete(name);
  return byName;
}
