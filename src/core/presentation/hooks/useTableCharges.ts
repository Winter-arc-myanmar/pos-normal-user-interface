import { useCallback, useEffect, useState } from "react";
import container from "../../infrastructure/di/container";
import type { ApiTableChargeRepository } from "../../infrastructure/repositories/ApiTableChargeRepository";
import type { TableCharges } from "../../domain/entities/TableCharge";

const EMPTY: TableCharges = { offered: [], running: [] };

/** A table's charges and running clocks, with adding a charge and stopping clocks. */
export function useTableCharges(sessionId: string | null) {
  const [loaded, setLoaded] = useState<{ sessionId: string; charges: TableCharges } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = () => container.resolve<ApiTableChargeRepository>("tableChargeRepository");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    repository()
      .get(sessionId)
      .then((charges) => {
        if (!cancelled) setLoaded({ sessionId, charges });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ sessionId, charges: EMPTY });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const run = useCallback(
    async (work: (id: string) => Promise<TableCharges>) => {
      if (!sessionId) return null;
      setIsBusy(true);
      setError(null);
      try {
        const charges = await work(sessionId);
        setLoaded({ sessionId, charges });
        return charges;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Couldn't update the table charges");
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    [sessionId]
  );

  const add = useCallback(
    (variantId: string, units?: number) => run((id) => repository().add(id, variantId, units)),
    [run]
  );
  const stop = useCallback((variantId?: string) => run((id) => repository().stop(id, variantId)), [run]);

  const charges = sessionId && loaded?.sessionId === sessionId ? loaded.charges : EMPTY;
  return { charges, add, stop, isBusy, error };
}
