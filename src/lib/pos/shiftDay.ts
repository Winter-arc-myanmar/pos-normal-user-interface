const HOUR = 3_600_000;

/** Where a room board's day stands: fine, ending within the hour, or over. */
export function dayStatus(dueAt: string | null, now: number): "none" | "ok" | "ending" | "over" {
  if (!dueAt) return "none";
  const left = new Date(dueAt).getTime() - now;
  if (left <= 0) return "over";
  return left <= HOUR ? "ending" : "ok";
}
