type KdsLineState = {
  status?: string;
  firedAt?: string | null;
  voidedAt?: string | null;
};

const SENT_STATUS_MARKERS = [
  "FIRED",
  "SENT",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
  "BUMPED",
  "VOIDED",
  "CANCELLED",
];

/** A line which has not already been handed to the kitchen. */
export const isPendingKdsLine = (line: KdsLineState): boolean => {
  if (line.voidedAt || line.firedAt) return false;
  const status = String(line.status || "").trim().toUpperCase();
  return !SENT_STATUS_MARKERS.some((marker) => status.includes(marker));
};

export const pendingKdsLines = <T extends KdsLineState>(lines: T[]): T[] =>
  lines.filter(isPendingKdsLine);
