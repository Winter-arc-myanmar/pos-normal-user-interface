import type { Hostess } from "@/core/domain/entities/Hostess";

/** How close a hostess's paid time is to its end: soon is the last ten minutes. */
export type HostessTimeTone = "ok" | "soon" | "over";

export interface HostessStatusRow {
  id: string;
  name: string;
  fullName: string;
  inRoom: boolean;
  roomNumber?: string;
  roomId?: string;
  since?: string;
  /** Whole minutes of paid time left; undefined when she stays until the room closes. */
  minutesLeft?: number;
  tone: HostessTimeTone;
}

const SOON_MINUTES = 10;

/** Each working hostess as the board shows her: soonest to finish first, free ones last. */
export function hostessStatusRows(hostesses: Hostess[], nowMs: number): HostessStatusRow[] {
  const rows = hostesses.map((hostess): HostessStatusRow => {
    const room = hostess.inRoom;
    const minutesLeft =
      room?.until != null
        ? Math.ceil((new Date(room.until).getTime() - nowMs) / 60000)
        : undefined;
    return {
      id: hostess.id,
      name: hostess.nickname || hostess.name,
      fullName: hostess.name,
      inRoom: Boolean(room),
      roomNumber: room?.roomNumber,
      roomId: room?.roomId,
      since: room?.since,
      minutesLeft,
      tone:
        minutesLeft === undefined
          ? "ok"
          : minutesLeft <= 0
            ? "over"
            : minutesLeft <= SOON_MINUTES
              ? "soon"
              : "ok",
    };
  });
  const rank = (row: HostessStatusRow) =>
    !row.inRoom ? 2 : row.minutesLeft === undefined ? 1 : 0;
  return rows.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.minutesLeft ?? 0) - (b.minutesLeft ?? 0) ||
      a.name.localeCompare(b.name)
  );
}

/** Minutes as the board writes them: 0:42, 1:05. */
export const formatMinutesLeft = (minutes: number): string => {
  const shown = Math.max(0, minutes);
  return `${Math.floor(shown / 60)}:${String(shown % 60).padStart(2, "0")}`;
};
