import type { ProductFilterDTO } from "@/core/application/dtos/CashierDTO";

/**
 * The ordering menu's product query.
 *
 * It is branch-scoped, because the workspace resolves the active branch a moment
 * after the first render: an unscoped menu and a scoped one then land out of
 * order, and the menu looks like it changed names on refresh.
 *
 * It is name-ordered as well, because the backend's default page of products is
 * not a stable order, so the same refresh could return a different set of items.
 *
 * It returns null while the branch is still unknown, so the caller waits instead
 * of fetching a menu it would immediately have to replace.
 */
export const menuProductFilter = (locationId: string): ProductFilterDTO | null =>
  locationId
    ? {
        page: 1,
        limit: 100,
        inStockOnly: true,
        sortBy: "name",
        sortOrder: "asc",
        locationId,
      }
    : null;
