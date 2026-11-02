import type { SalesOrderLine } from "@/core/domain/entities/Cashier";

/** The guest's In and Out as the cashier sets them, in datetime-local form. */
export interface ManualTimes {
  inAt: string;
  outAt: string;
}

const ROOM_CATEGORIES = ["Spa Packages", "Spa Rooms", "KTV Rooms", "Private VIP Lounges"];

/** The KTV room's own time: the rate rented by the hour or half hour. */
const KTV_ROOM_CATEGORIES = ["KTV Rooms", "Private VIP Lounges"];

/** Room time on the bill: the room's rate, a rental, a package, or time given free. */
const ROOM_COURSE = /^(Hours|Extension|Sessions|Package)( ·|$)|^Free · /;

const pad = (value: number) => String(value).padStart(2, "0");

/** An ISO time as a datetime-local box shows it, in the till's own time zone. */
export const toLocalInput = (value: string | number | Date): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

/** A datetime-local box's value as an ISO time; undefined when empty or unreadable. */
export const fromLocalInput = (value: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

/**
 * What the boxes start with: In when the room was taken, Out when its booked time
 * ends, or now for a room with no time booked. The cashier changes them as needed.
 */
export const defaultManualTimes = (
  session: { openedAt: string; plannedMinutes?: number },
  now: number = Date.now()
): ManualTimes => {
  const opened = new Date(session.openedAt).getTime();
  const out = session.plannedMinutes ? opened + session.plannedMinutes * 60_000 : now;
  return { inAt: toLocalInput(opened), outAt: toLocalInput(out) };
};

/** The Out is set and is before the In. */
export const manualTimesBackwards = (times: ManualTimes) => {
  const inAt = fromLocalInput(times.inAt);
  const outAt = fromLocalInput(times.outAt);
  return Boolean(inAt && outAt && outAt < inAt);
};

const clock = (iso: string) => {
  const date = new Date(iso);
  return `${date.getHours() % 12 || 12}:${pad(date.getMinutes())}`;
};

/** How the slip writes them beside the room charge, as staff wrote it by hand: "4:15 - 6:15". */
export const slipTimeRange = (inAt?: string | null, outAt?: string | null): string | undefined =>
  inAt && outAt ? `${clock(inAt)} - ${clock(outAt)}` : undefined;

/**
 * The time the guest had, as a KTV room's slip counts it: "2.5h". The room is
 * sold by the hour and the row has to fit one line, so it prints short.
 */
export const slipSessionCount = (
  inAt?: string | null,
  outAt?: string | null
): string | undefined => {
  if (!inAt || !outAt) return undefined;
  const minutes = (new Date(outAt).getTime() - new Date(inAt).getTime()) / 60_000;
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  const hours = Math.round((minutes / 60) * 100) / 100;
  return `${hours.toLocaleString("en-US", { maximumFractionDigits: 2 })}h`;
};

export const isRoomTimeLine = (line: Pick<SalesOrderLine, "categoryName" | "courseType">) =>
  ROOM_CATEGORIES.includes(line.categoryName || "") || ROOM_COURSE.test(line.courseType || "");

/** KTV room time, sold by the hour or the half hour, from the room's own rates. */
export const isKtvRoomTimeLine = (line: Pick<SalesOrderLine, "categoryName">) =>
  KTV_ROOM_CATEGORIES.includes(line.categoryName || "");

/**
 * The name a line prints with: the first room-time line carries the time the
 * guest had after it, "VIP Lounge 111 (2.5h) (4:15 - 6:15)", and every other
 * line as it is.
 */
export const roomTimeNamer = (
  lines: SalesOrderLine[],
  range?: string,
  sessions?: string
) => {
  const room = range || sessions ? lines.find(isRoomTimeLine) : undefined;
  const notes: string[] = [];
  if (sessions) notes.push(`(${sessions})`);
  if (range) notes.push(`(${range})`);
  return (line: SalesOrderLine, name: string) =>
    room && line.id === room.id && notes.length ? `${name} ${notes.join(" ")}` : name;
};
