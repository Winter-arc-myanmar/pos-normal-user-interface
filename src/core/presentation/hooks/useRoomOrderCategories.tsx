import { useCallback, useRef } from "react";
import type { RoomOrderView } from "../../domain/entities/RoomTablet";
import type { ICashierService } from "../../domain/services/ICashierService";
import container from "../../infrastructure/di/container";
import { categoryByProductName } from "@/lib/spa/menuCategoryLookup";

/**
 * Fills in the menu category a room order's items do not carry.
 *
 * The room-order view the API returns names each item after its product but has
 * no category, and a kitchen ticket is routed to its station by that category.
 * Without it every item falls back to the till's own printer, which is how a
 * room's rice and beer both came out at the bar. The product list knows the
 * category of each name, so it fills the gap here, once per session.
 */
export function useRoomOrderCategories() {
  const known = useRef<Promise<Map<string, string>> | null>(null);

  const byName = useCallback(() => {
    known.current ??= Promise.resolve()
      .then(() =>
        container
          .resolve<ICashierService>("cashierService")
          .getProducts({})
      )
      .then(categoryByProductName)
      .catch(() => {
        // A till that cannot read the menu still prints: the items are reported
        // as unrouted rather than sent to the wrong station.
        known.current = null;
        return new Map<string, string>();
      });
    return known.current;
  }, []);

  return useCallback(
    async (order: RoomOrderView): Promise<RoomOrderView> => {
      if (order.items.every((item) => item.categoryId)) return order;
      const lookup = await byName();
      return {
        ...order,
        items: order.items.map((item) => ({
          ...item,
          categoryId:
            item.categoryId ||
            lookup.get(item.name.trim().toLowerCase()) ||
            null,
        })),
      };
    },
    [byName]
  );
}
