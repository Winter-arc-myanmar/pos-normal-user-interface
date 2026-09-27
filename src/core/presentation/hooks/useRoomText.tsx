import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { RoomKind } from "./useRoomPos";

/**
 * Room POS wording. KTV reuses the spa's text and overrides only what differs, such
 * as hours for sessions and a room for a treatment.
 */
export function useRoomText(kind: RoomKind) {
  const { t, i18n } = useTranslation();
  return useCallback(
    (key: string, options?: Record<string, unknown>) =>
      kind === "ktv" && i18n?.exists?.(`ktvPos.${key}`)
        ? t(`ktvPos.${key}`, options)
        : t(`spa.${key}`, options),
    [i18n, kind, t]
  );
}
