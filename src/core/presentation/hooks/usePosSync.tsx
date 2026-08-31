import { useCallback, useEffect, useMemo, useState } from "react";
import { PosSyncContextDTO } from "../../application/dtos/PosSyncDTO";
import { IPosSyncService } from "../../domain/services/IPosSyncService";
import container from "../../infrastructure/di/container";
import {
  PosSyncActionKey,
  readAllPosSyncLastRuns,
  writePosSyncLastRun,
} from "@/lib/pos/posSyncStorage";

interface UsePosSyncOptions {
  tenantId?: string;
  locationId?: string;
  posRegisterId?: string;
  posSessionId?: string;
}

export function usePosSync({
  tenantId = "",
  locationId,
  posRegisterId,
  posSessionId,
}: UsePosSyncOptions) {
  const [lastRuns, setLastRuns] = useState(readAllPosSyncLastRuns);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const posSyncService = container.resolve<IPosSyncService>("posSyncService");

  useEffect(() => {
    setLastRuns(readAllPosSyncLastRuns());
  }, []);

  const context = useMemo<PosSyncContextDTO>(
    () => ({
      tenantId,
      locationId: locationId || undefined,
      posRegisterId: posRegisterId || undefined,
      posSessionId: posSessionId || undefined,
    }),
    [locationId, posRegisterId, posSessionId, tenantId]
  );

  const clearError = useCallback(() => setError(null), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const recordRun = useCallback((action: PosSyncActionKey, completedAt: string) => {
    writePosSyncLastRun(action, completedAt);
    setLastRuns(readAllPosSyncLastRuns());
  }, []);

  const runAction = useCallback(
    async (
      action: PosSyncActionKey,
      runner: (ctx: PosSyncContextDTO) => ReturnType<IPosSyncService["pullLatestSettings"]>,
      fallbackNotice: string
    ) => {
      setIsLoading(true);
      clearError();
      clearNotice();
      try {
        const result = await runner(context);
        recordRun(action, result.completedAt);
        setNotice(result.message || fallbackNotice);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "POS sync action failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, clearNotice, context, posSyncService, recordRun]
  );

  const pullLatestSettings = useCallback(
    () =>
      runAction(
        "settings",
        (ctx) => posSyncService.pullLatestSettings(ctx),
        "Settings sync completed"
      ),
    [posSyncService, runAction]
  );

  const pullItemUpdates = useCallback(
    () =>
      runAction(
        "items",
        (ctx) => posSyncService.pullItemUpdates(ctx),
        "Item updates completed"
      ),
    [posSyncService, runAction]
  );

  const uploadOrders = useCallback(
    () =>
      runAction(
        "orders",
        (ctx) => posSyncService.uploadOrders(ctx),
        "Orders uploaded"
      ),
    [posSyncService, runAction]
  );

  const restartService = useCallback(
    () =>
      runAction(
        "restart",
        (ctx) => posSyncService.restartService(ctx),
        "Service restart requested"
      ),
    [posSyncService, runAction]
  );

  return {
    lastSettingsSyncAt: lastRuns.settings || null,
    lastItemSyncAt: lastRuns.items || null,
    lastOrderUploadAt: lastRuns.orders || null,
    lastRestartAt: lastRuns.restart || null,
    isLoading,
    error,
    notice,
    pullLatestSettings,
    pullItemUpdates,
    uploadOrders,
    restartService,
    clearError,
    clearNotice,
  };
}
