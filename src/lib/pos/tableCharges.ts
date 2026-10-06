import type { TableChargeOffer } from "@/core/domain/entities/TableCharge";

/** Whole minutes since a clock started. */
export const minutesSince = (startedAt: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));

/** What a clock comes to so far, the way the server bills it: whole blocks, at least the minimum. */
export const clockSoFar = (charge: TableChargeOffer | undefined, startedAt: string, now: number) => {
  if (!charge) return null;
  const block = charge.timeBlockMinutes ?? 60;
  const units = Math.max(charge.minimumBlocks ?? 1, Math.ceil(minutesSince(startedAt, now) / block));
  return units * charge.unitPrice;
};
