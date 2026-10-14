import type { RunningPromotion } from "../../domain/entities/Promotion";
import type { RoomKind } from "./useRoomPos";
import { usePromotions } from "./usePromotions";

type PreviewItem = { variantId: string; quantity: number; unitPrice?: number };

/**
 * Promotions for a SPA or KTV room: what is running now, and what they take off the
 * items waiting to be added. The server applies them by itself when the items are
 * charged; this only lets the cashier and guest see the saving before the tap.
 */
export function useRoomPromotions(
  kind: RoomKind,
  locationId: string | undefined,
  /** The items to preview; given what is running, as free time changes what is paid. */
  itemsFor: (running: RunningPromotion[]) => PreviewItem[],
  /** The room's open bill, so a per-bill limit counts what it already used. */
  salesOrderId?: string
) {
  return usePromotions(
    kind === "ktv" ? "KTV" : "SPA",
    locationId,
    itemsFor,
    salesOrderId
  );
}
