const STORAGE_PREFIX = "pos:activeLocation:";

export function readStoredActiveLocationId(tenantId: string): string | null {
  if (!tenantId) return null;
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${tenantId}`);
  } catch {
    return null;
  }
}

export function writeStoredActiveLocationId(
  tenantId: string,
  locationId: string
): void {
  if (!tenantId || !locationId) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${tenantId}`, locationId);
  } catch {
    // Ignore storage failures in embedded WebViews.
  }
}

export function resolveActiveLocationId(
  tenantId: string,
  locations: Array<{ id: string }>
): string {
  if (!locations.length) return "";

  const storedId = readStoredActiveLocationId(tenantId);
  if (storedId && locations.some((location) => location.id === storedId)) {
    return storedId;
  }

  const nextId = locations[0]?.id || "";
  if (nextId) {
    writeStoredActiveLocationId(tenantId, nextId);
  }
  return nextId;
}
