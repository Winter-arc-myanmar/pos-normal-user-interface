import { useEffect, useState } from "react";
import container from "../../infrastructure/di/container";
import type { ApiSpaPackageRepository } from "../../infrastructure/repositories/ApiSpaPackageRepository";
import type { SpaPackage } from "../../domain/entities/Spa";

/** The service packages on sale, loaded only where SPA treatments are sold. */
export function useSpaPackages(enabled: boolean) {
  const [packages, setPackages] = useState<SpaPackage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    container
      .resolve<ApiSpaPackageRepository>("spaPackageRepository")
      .onSale()
      .then((list) => {
        if (!cancelled) setPackages(list);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { packages, error };
}
