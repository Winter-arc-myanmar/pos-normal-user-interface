import {
  KtvRoom,
  KtvSession,
} from "@/core/domain/entities/Ktv";

export type KtvWarningLevel = "NORMAL" | "WARNING" | "EXPIRED";

export const isOpenKtvSession = (session?: KtvSession | null): boolean =>
  Boolean(
    session &&
      session.sessionState !== "CLOSED" &&
      !session.closedAt
  );

export const findActiveKtvSession = (
  room?: KtvRoom | null
): KtvSession | undefined =>
  [...(room?.sessions || [])]
    .filter(isOpenKtvSession)
    .sort(
      (left, right) =>
        new Date(right.openedAt || 0).getTime() -
        new Date(left.openedAt || 0).getTime()
    )[0];

export const getKtvWarning = (
  endsAt?: string | null,
  nowMs: number = Date.now()
): {
  level: KtvWarningLevel;
  remainingMinutes: number | null;
} => {
  if (!endsAt) return { level: "NORMAL", remainingMinutes: null };
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(endMs)) {
    return { level: "NORMAL", remainingMinutes: null };
  }
  const remainingMinutes = Math.ceil((endMs - nowMs) / 60000);
  if (remainingMinutes <= 0) {
    return { level: "EXPIRED", remainingMinutes };
  }
  if (remainingMinutes <= 15) {
    return { level: "WARNING", remainingMinutes };
  }
  return { level: "NORMAL", remainingMinutes };
};

export const hasSufficientWalletBalance = (
  balance: string | number | undefined,
  total: string | number
): boolean =>
  Number(balance || 0) + 0.0001 >= Math.max(0, Number(total || 0));
