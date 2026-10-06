import { useEffect, useState } from "react";
import container from "../../infrastructure/di/container";
import type { ICashierRepository } from "../../domain/repositories/ICashierRepository";
import type { RentalChoice } from "@/lib/spa/freeTime";

/**
 * The rentals a KTV room can be sold under (GET /products?placeId=<room>), each
 * with its variant and how its time is counted. Empty until a room is chosen.
 */
export function useKtvRentals(roomId: string | null) {
  const [loaded, setLoaded] = useState<{ roomId: string; rentals: RentalChoice[] } | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const repository = container.resolve<ICashierRepository>("cashierRepository");
    let cancelled = false;
    void (async () => {
      try {
        const { products } = await repository.listProducts({
          placeId: roomId,
          isAvailable: true,
          limit: 50,
        });
        const choices = await Promise.all(
          products.map(async (product) => {
            const { variants } = await repository.listVariants(product.id, { limit: 1 });
            const variant = variants[0];
            if (!variant) return null;
            return {
              variantId: variant.id,
              productId: product.id,
              name: product.name,
              unitPrice: Number(product.basePrice || 0) + Number(variant.priceModifier || 0),
              blockMinutes: product.timeBlockMinutes || 60,
              minimumUnits: product.minimumBlocks || 1,
            };
          })
        );
        if (!cancelled) {
          setLoaded({ roomId, rentals: choices.filter((item): item is RentalChoice => !!item) });
        }
      } catch {
        if (!cancelled) setLoaded({ roomId, rentals: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Another room's list is never shown while this one loads.
  return roomId && loaded?.roomId === roomId ? loaded.rentals : [];
}
