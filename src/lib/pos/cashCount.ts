/** Kyat notes a drawer holds, largest first. */
export const NOTES = [10000, 5000, 1000, 500, 200, 100, 50] as const;

export type NoteCount = Partial<Record<(typeof NOTES)[number], number>>;

export const countTotal = (count: NoteCount) =>
  NOTES.reduce((sum, note) => sum + note * Math.max(0, Math.floor(count[note] ?? 0)), 0);

/** Counted against expected: below zero the drawer is short, above it is over. */
export const cashDifference = (counted: number, expected: number) =>
  Math.round((counted - expected) * 100) / 100;

const HOUR = 3_600_000;

/** Where a room board's day stands: fine, ending within the hour, or over. */
export function dayStatus(dueAt: string | null, now: number): "none" | "ok" | "ending" | "over" {
  if (!dueAt) return "none";
  const left = new Date(dueAt).getTime() - now;
  if (left <= 0) return "over";
  return left <= HOUR ? "ending" : "ok";
}

/** The drawer's own tender: the active method whose kind is cash. */
export function findCashMethod<T extends { id: string; kind?: string; code?: string; isActive?: boolean }>(
  methods: T[]
): T | undefined {
  const active = methods.filter((method) => method.isActive !== false);
  return (
    active.find((method) => method.kind?.toUpperCase() === "CASH") ??
    active.find((method) => !method.kind && method.code?.toUpperCase() === "CASH")
  );
}
