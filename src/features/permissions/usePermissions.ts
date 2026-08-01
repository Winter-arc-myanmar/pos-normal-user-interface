import { useMemo } from "react";
import type { User } from "@/core/domain/entities/User";
import { useAuth } from "@/core/presentation/hooks/useAuth";

/**
 * Permission skeleton for route/sidebar guards.
 * Adapt role names and permission keys to your backend contract.
 */
const FULL_ACCESS_ROLE = "ROOT_ADMIN";

export const PAGE_PERMISSIONS = {
  dashboard: [] as string[],
  users: ["MANAGE_USERS"],
  customers: ["MANAGE_CUSTOMERS"],
} as const;

export const PERMISSION_ROUTE_ORDER = [
  { path: "/dashboard", permissions: PAGE_PERMISSIONS.dashboard },
  { path: "/users", permissions: PAGE_PERMISSIONS.users },
  { path: "/customers", permissions: PAGE_PERMISSIONS.customers },
] as const;

const normalizePermission = (value: string) => value.trim().toUpperCase();

const hasFullAccess = (user: User | null) =>
  normalizePermission(String(user?.adminRoleName || user?.role || "")) ===
    FULL_ACCESS_ROLE ||
  normalizePermission(String(user?.role || "")) === "ADMIN";

const extractUserPermissions = (user: User | null): string[] => {
  if (!user || !Array.isArray(user.permissions)) return [];

  return user.permissions
    .filter((value): value is string => typeof value === "string")
    .map(normalizePermission)
    .filter(Boolean);
};

export function usePermissions() {
  const { user } = useAuth();

  const isFullAccess = useMemo(() => hasFullAccess(user), [user]);
  const permissions = useMemo(() => extractUserPermissions(user), [user]);
  const resolvedRoleName = String(
    user?.adminRoleName || user?.role || ""
  ).trim();

  const hasPermission = (requiredPermission: string) => {
    if (isFullAccess) return true;
    return permissions.includes(normalizePermission(requiredPermission));
  };

  const canAccess = (requiredPermissions?: readonly string[]) => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    if (isFullAccess) return true;
    return requiredPermissions.some((permission) => hasPermission(permission));
  };

  return {
    permissions,
    resolvedRoleName,
    isFullAccess,
    isLoading: false,
    hasPermission,
    canAccess,
  };
}
