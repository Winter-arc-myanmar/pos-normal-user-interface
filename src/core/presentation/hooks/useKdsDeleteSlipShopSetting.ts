import { useCallback, useEffect, useState } from "react";
import container from "../../infrastructure/di/container";
import type { ApiVenueSettingRepository } from "../../infrastructure/repositories/ApiVenueSettingRepository";
import { usePermissions } from "@/features/permissions/usePermissions";
import { useVenueSetting } from "./useVenueSetting";

/**
 * The shop-wide KDS DELETE slip setting. It lives on Venue setup so every POS
 * follows the same choice; only accounts with the venue-setting write
 * permission can change it.
 */
export function useKdsDeleteSlipShopSetting() {
  const { kdsDeleteSlips } = useVenueSetting();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("pos:venue-setting:write");
  const [enabled, setEnabled] = useState(kdsDeleteSlips);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(kdsDeleteSlips);
  }, [kdsDeleteSlips]);

  const save = useCallback(
    async (next: boolean) => {
      if (!canWrite || isSaving) return;
      setError(null);
      setIsSaving(true);
      try {
        const updated = await container
          .resolve<ApiVenueSettingRepository>("venueSettingRepository")
          .updateKdsDeleteSlips(next);
        setEnabled(updated.kdsDeleteSlips);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to save the KDS delete slip setting."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [canWrite, isSaving]
  );

  return { enabled, canWrite, isSaving, error, save };
}
