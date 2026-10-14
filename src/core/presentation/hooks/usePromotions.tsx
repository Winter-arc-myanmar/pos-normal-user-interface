import { useEffect, useMemo, useState } from "react";
import container from "../../infrastructure/di/container";
import type { ApiPromotionRepository } from "../../infrastructure/repositories/ApiPromotionRepository";
import type {
  PosType,
  PromotionDiscount,
  RunningPromotion,
} from "../../domain/entities/Promotion";

type PreviewItem = { variantId: string; quantity: number; unitPrice?: number };

const REFRESH_MS = 60000;
const PREVIEW_DELAY_MS = 300;

/**
 * Promotions for one POS area: what is running now, and what they take off the
 * items given. The server applies them by itself when the items are charged; this
 * only lets the till show the saving before the tap.
 */
export function usePromotions(
  posType: PosType,
  locationId: string | undefined,
  /** The items to preview; given what is running, as free time changes what is paid. */
  itemsFor: (running: RunningPromotion[]) => PreviewItem[],
  /** The open bill, so a per-bill limit counts what it already used. */
  salesOrderId?: string
) {
  const [running, setRunning] = useState<RunningPromotion[]>([]);
  const [discounts, setDiscounts] = useState<Record<string, PromotionDiscount>>({});

  useEffect(() => {
    const repository = container.resolve<ApiPromotionRepository>("promotionRepository");
    let cancelled = false;
    const load = () =>
      repository
        .running(posType, locationId)
        .then((list) => {
          if (!cancelled) setRunning(list);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [locationId, posType]);

  const items = itemsFor(running);
  const itemsKey = items
    .map((item) => `${item.variantId}:${item.quantity}:${item.unitPrice ?? ""}`)
    .join(",");
  const hasPromotions = running.length > 0;

  useEffect(() => {
    if (!hasPromotions || !itemsKey) return;
    const repository = container.resolve<ApiPromotionRepository>("promotionRepository");
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const wanted = itemsKey.split(",").map((entry) => {
        const [variantId, quantity, unitPrice] = entry.split(":");
        return {
          variantId,
          quantity: Number(quantity),
          ...(unitPrice ? { unitPrice: Number(unitPrice) } : {}),
        };
      });
      repository
        .preview(posType, locationId, wanted, salesOrderId)
        .then((result) => {
          if (!cancelled) setDiscounts(result);
        })
        .catch(() => {
          if (!cancelled) setDiscounts({});
        });
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasPromotions, itemsKey, locationId, posType, salesOrderId]);

  const nameById = useMemo(
    () => Object.fromEntries(running.map((promotion) => [promotion.id, promotion.name])),
    [running]
  );

  return {
    running,
    discounts: hasPromotions && itemsKey ? discounts : {},
    promotionName: (id: string | undefined) => (id ? nameById[id] : undefined),
  };
}
