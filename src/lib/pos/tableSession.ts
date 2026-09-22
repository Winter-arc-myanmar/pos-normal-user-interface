type TableSessionLike = {
  tableId?: string;
  closedAt?: string | null;
  sessionState?: string | null;
  openedAt?: string | null;
};

export function normalizeDiningTableStatus(status?: string | null): string {
  return String(status || "AVAILABLE").trim().toUpperCase();
}

export function isOccupiedDiningTable(status?: string | null): boolean {
  return normalizeDiningTableStatus(status) === "OCCUPIED";
}

export function isOpenTableSession(
  session?: TableSessionLike | null
): boolean {
  if (!session) return false;
  const state = String(session.sessionState || "").toUpperCase();
  if (state === "CLOSED") return false;
  if (session.closedAt) return false;
  return true;
}

export function findOpenTableSession<T extends TableSessionLike>(
  sessions: T[],
  tableId: string
): T | undefined {
  return sessions
    .filter(
      (session) => session.tableId === tableId && isOpenTableSession(session)
    )
    .sort(
      (left, right) =>
        new Date(right.openedAt || 0).getTime() -
        new Date(left.openedAt || 0).getTime()
    )[0];
}
