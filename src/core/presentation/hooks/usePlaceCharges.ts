import { useEffect, useState } from "react";
import container from "../../infrastructure/di/container";
import type { ICashierRepository } from "../../domain/repositories/ICashierRepository";
import type { RentalChoice } from "@/lib/spa/freeTime";

/**
 * The charges a room or table offers (GET /products?placeId=<place>): a KTV room's
 * rentals, a SPA room's fees. Each with its variant and how it is charged. Empty
 * until a place is chosen.
 */
export function usePlaceCharges(roomId: string | null) {
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
              soldBy: product.soldBy ?? "TIME",
              chargeMode: product.chargeMode ?? null,
              autoApply: product.autoApply ?? false,
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
