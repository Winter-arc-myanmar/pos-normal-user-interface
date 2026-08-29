import { clearStoredActiveLocationId } from "./activeLocation";

const LAST_AUTH_USER_KEY = "pos:lastAuthUserId";

export function readLastAuthUserId(): string | null {
  try {
    return sessionStorage.getItem(LAST_AUTH_USER_KEY);
  } catch {
    return null;
  }
}

export function writeLastAuthUserId(userId: string): void {
  if (!userId) return;
  try {
    sessionStorage.setItem(LAST_AUTH_USER_KEY, userId);
  } catch {
    // Ignore storage failures in embedded WebViews.
  }
}

export function clearLastAuthUserId(): void {
  try {
    sessionStorage.removeItem(LAST_AUTH_USER_KEY);
  } catch {
    // Ignore storage failures in embedded WebViews.
  }
}

export function shouldBootstrapPosWorkspace(userId: string): boolean {
  if (!userId) return false;
  return readLastAuthUserId() !== userId;
}

export function markPosWorkspaceBootstrapped(userId: string): void {
  writeLastAuthUserId(userId);
}

export function clearPosWorkspaceStorage(tenantId?: string): void {
  clearLastAuthUserId();
  if (tenantId) {
    clearStoredActiveLocationId(tenantId);
  }
}

export function preparePosWorkspaceForLogin(tenantId?: string): void {
  clearPosWorkspaceStorage(tenantId);
}
