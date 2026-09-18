export const WAITLIST_STALE_AFTER_MINUTES = 6 * 60;

type WaitlistTiming = {
  joinedAt?: string | null;
  status?: string | null;
  seatedAt?: string | null;
  canceledAt?: string | null;
};

const toMs = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function isActiveWaitlistStatus(status?: string | null): boolean {
  const value = String(status || "").toUpperCase();
  return value === "WAITING" || value === "NOTIFIED";
}

export function waitlistElapsedMinutes(
  entry: WaitlistTiming,
  nowMs: number = Date.now()
): number {
  const startMs = toMs(entry.joinedAt);
  if (startMs == null) return 0;

  let endMs = nowMs;
  const status = String(entry.status || "").toUpperCase();
  if (status === "SEATED") {
    endMs = toMs(entry.seatedAt) ?? nowMs;
  } else if (status === "CANCELED" || status === "NO_SHOW") {
    endMs = toMs(entry.canceledAt) ?? nowMs;
  }

  return Math.max(0, Math.floor((endMs - startMs) / 60_000));
}

export function isStaleWaitlistEntry(
  entry: WaitlistTiming,
  nowMs: number = Date.now(),
  staleAfterMinutes: number = WAITLIST_STALE_AFTER_MINUTES
): boolean {
  if (!isActiveWaitlistStatus(entry.status)) return false;
  return waitlistElapsedMinutes(entry, nowMs) >= staleAfterMinutes;
}

export function formatWaitDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}
