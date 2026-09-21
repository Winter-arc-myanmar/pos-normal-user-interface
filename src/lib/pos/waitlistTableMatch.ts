import { isOpenTableSession } from "./tableSession";

export { isOpenTableSession };

type WaitlistTable = {
  id: string;
  tableNumber?: string | null;
  zoneId?: string | null;
  maxSeats?: number | null;
  status?: string | null;
};

type WaitlistZone = {
  id: string;
  name?: string | null;
};

type WaitlistSession = {
  closedAt?: string | null;
  sessionState?: string | null;
};

const tokensOf = (value?: string | null): string[] =>
  String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export function isVacantWaitlistTable(
  table: WaitlistTable,
  session?: WaitlistSession | null
): boolean {
  if (isOpenTableSession(session)) return false;
  const status = String(table.status || "").toUpperCase();
  return status !== "RESERVED";
}

export function tableFitsParty(
  table: WaitlistTable,
  partySize: number
): boolean {
  const seats = Number(table.maxSeats || 0);
  if (!Number.isFinite(seats) || seats <= 0) return true;
  return seats >= Math.max(1, partySize || 1);
}

export function tableMatchesPreferredZone(
  table: WaitlistTable,
  preferredZoneId?: string | null,
  zones: WaitlistZone[] = []
): boolean {
  if (!preferredZoneId) return false;
  const preferredId = String(preferredZoneId);
  const tableZoneId = String(table.zoneId || "");
  if (tableZoneId && tableZoneId === preferredId) return true;

  const preferredZone = zones.find((zone) => zone.id === preferredId);
  const tableZone = zones.find((zone) => zone.id === tableZoneId);
  const preferredName = String(preferredZone?.name || preferredId).toLowerCase();
  const tableName = String(tableZone?.name || "").toLowerCase();
  const tableNumber = String(table.tableNumber || "").toLowerCase();

  if (tableName && (tableName === preferredName || tableName.includes(preferredName) || preferredName.includes(tableName))) {
    return true;
  }

  const preferredTokens = new Set(tokensOf(`${preferredName} ${preferredId}`));
  const tableTokens = new Set(tokensOf(`${tableName} ${tableNumber}`));
  if (preferredTokens.has("vip") && (tableTokens.has("vip") || tableNumber.includes("vip"))) {
    return true;
  }

  const genericTokens = new Set(["zone", "table", "area", "room", "dining"]);
  return [...preferredTokens].some(
    (token) =>
      token.length >= 3 &&
      !genericTokens.has(token) &&
      (tableTokens.has(token) || tableNumber.includes(token))
  );
}

export function selectWaitlistTables<T extends WaitlistTable>(
  tables: T[],
  options: {
    getSession: (tableId: string) => WaitlistSession | null | undefined;
    preferredZoneId?: string | null;
    zones?: WaitlistZone[];
    partySize?: number;
  }
): T[] {
  const vacant = tables.filter((table) =>
    isVacantWaitlistTable(table, options.getSession(table.id))
  );

  return [...vacant].sort((left, right) => {
    const leftZone = tableMatchesPreferredZone(
      left,
      options.preferredZoneId,
      options.zones
    )
      ? 0
      : 1;
    const rightZone = tableMatchesPreferredZone(
      right,
      options.preferredZoneId,
      options.zones
    )
      ? 0
      : 1;
    if (leftZone !== rightZone) return leftZone - rightZone;

    const partySize = options.partySize || 1;
    const leftFit = tableFitsParty(left, partySize) ? 0 : 1;
    const rightFit = tableFitsParty(right, partySize) ? 0 : 1;
    if (leftFit !== rightFit) return leftFit - rightFit;

    return String(left.tableNumber || left.id).localeCompare(
      String(right.tableNumber || right.id)
    );
  });
}
