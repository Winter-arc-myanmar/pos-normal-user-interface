const STORAGE_KEY = "pos:sync:lastRuns";

export type PosSyncActionKey =
  | "settings"
  | "items"
  | "orders"
  | "restart";

type PosSyncLastRuns = Partial<Record<PosSyncActionKey, string>>;

const readRuns = (): PosSyncLastRuns => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PosSyncLastRuns;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeRuns = (runs: PosSyncLastRuns) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // Ignore storage failures in embedded WebViews.
  }
};

export function readPosSyncLastRun(action: PosSyncActionKey): string | null {
  return readRuns()[action] || null;
}

export function writePosSyncLastRun(
  action: PosSyncActionKey,
  timestamp: string
): void {
  writeRuns({
    ...readRuns(),
    [action]: timestamp,
  });
}

export function readAllPosSyncLastRuns(): PosSyncLastRuns {
  return readRuns();
}
