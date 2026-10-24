import type { CurrentShift } from "@/core/domain/entities/Shift";

const HOUR = 3_600_000;

/** Where a room board's day stands: fine, ending within the hour, or over. */
export function dayStatus(dueAt: string | null, now: number): "none" | "ok" | "ending" | "over" {
  if (!dueAt) return "none";
  const left = new Date(dueAt).getTime() - now;
  if (left <= 0) return "over";
  return left <= HOUR ? "ending" : "ok";
}

/**
 * The shift this cashier may sell on: on a per-login device only their own, on a
 * daily one whoever's is open. Empty when there is none.
 */
export function usableShiftId(
  current: Pick<CurrentShift, "shiftRule" | "shift"> | null,
  cashierId: string
): string {
  if (!current?.shift) return "";
  const { shift, shiftRule } = current;
  return shiftRule === "DAILY" || shift.cashierId === cashierId ? shift.id : "";
}
