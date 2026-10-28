import { useCallback, useEffect, useMemo, useState } from "react";
import container from "../../infrastructure/di/container";
import type { ApiExtraFeeRepository } from "../../infrastructure/repositories/ApiExtraFeeRepository";
import type { ExtraFee } from "../../domain/entities/ExtraFee";

/** The shop's extra fees, and whether a bill line is one of them. */
export function useExtraFees() {
  const [fees, setFees] = useState<ExtraFee[]>([]);

  useEffect(() => {
    let cancelled = false;
    container
      .resolve<ApiExtraFeeRepository>("extraFeeRepository")
      .list()
      .then((list) => {
        if (!cancelled) setFees(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const feeVariantIds = useMemo(() => new Set(fees.map((fee) => fee.variantId)), [fees]);
  const isFeeLine = useCallback(
    (line: { variantId: string }) => feeVariantIds.has(line.variantId),
    [feeVariantIds]
  );

  return { fees, isFeeLine };
}
