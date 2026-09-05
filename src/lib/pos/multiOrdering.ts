const STORAGE_KEY = "pos-multi-order-ids";

type TableOrderMap = Record<string, string[]>;

const readMap = (): TableOrderMap => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TableOrderMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeMap = (map: TableOrderMap) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

export const readTableOrderIds = (tableId: string): string[] => {
  const ids = readMap()[tableId];
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
};

export const writeTableOrderIds = (tableId: string, orderIds: string[]) => {
  const map = readMap();
  map[tableId] = Array.from(new Set(orderIds.filter(Boolean)));
  writeMap(map);
};

export const mergeTableOrderIds = (
  tableId: string,
  primaryOrderId: string,
  extraIds: string[] = []
): string[] => {
  const merged = Array.from(
    new Set([primaryOrderId, ...readTableOrderIds(tableId), ...extraIds].filter(Boolean))
  );
  writeTableOrderIds(tableId, merged);
  return merged;
};

export const clearTableOrderIds = (tableId: string) => {
  const map = readMap();
  delete map[tableId];
  writeMap(map);
};
