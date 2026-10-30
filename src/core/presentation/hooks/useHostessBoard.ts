import { useEffect, useState } from "react";
import container from "../../infrastructure/di/container";
import type { ApiHostessRepository } from "../../infrastructure/repositories/ApiHostessRepository";
import type { Hostess } from "../../domain/entities/Hostess";

const REFRESH_MS = 30_000;

/** The hostesses working now and the room each is in, kept fresh while shown. */
export function useHostessBoard(enabled = true) {
  const [hostesses, setHostesses] = useState<Hostess[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () =>
      container
        .resolve<ApiHostessRepository>("hostessRepository")
        .working()
        .then((list) => {
          if (cancelled) return;
          setHostesses(list);
          setError(null);
          setLoaded(true);
        })
        .catch((caught: unknown) => {
          if (cancelled) return;
          setError(caught instanceof Error ? caught.message : "Couldn't load hostesses");
          setLoaded(true);
        });
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return { hostesses, error, loaded };
}
