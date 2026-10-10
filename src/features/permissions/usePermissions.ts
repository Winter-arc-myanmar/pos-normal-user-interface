import { useMemo } from "react";
import type { User } from "@/core/domain/entities/User";
import { useAuth } from "@/core/presentation/hooks/useAuth";

/**
 * Permission skeleton for route/sidebar guards.
 * Adapt role names and permission keys to your backend contract.
 */
const FULL_ACCESS_ROLE = "ROOT_ADMIN";

export const PAGE_PERMISSIONS = {
  dashboard: ["reports:report:read"],
  salesSummary: ["reports:report:read"],
  users: ["iam:user:write"],
  customers: ["sales:customer:read"],
  cards: ["guestcard:card:read"],
  cashier: [] as string[],
  ktv: ["hospitality:ktv-session:read"],
  spa: ["hospitality:spa-session:read"],
  tablet: ["hospitality:room-tablet:write"],
  kds: ["hospitality:kds-ticket:read"],
  waitlist: [] as string[],
  diningTables: [] as string[],
  products: [] as string[],
  categories: [] as string[],
  tipPools: ["hospitality:tip-pool:read"],
  counterOrders: [] as string[],
  salesOrders: [] as string[],
  refunds: ["sales:refund:read", "sales:refund:write"],
  sync: [] as string[],
  settings: [] as string[],
} as const;

export const PERMISSION_ROUTE_ORDER = [
  { path: "/cashier", permissions: PAGE_PERMISSIONS.cashier },
  { path: "/ktv", permissions: PAGE_PERMISSIONS.ktv },
  { path: "/spa", permissions: PAGE_PERMISSIONS.spa },
  { path: "/counter-orders", permissions: PAGE_PERMISSIONS.counterOrders },
  { path: "/sales-orders", permissions: PAGE_PERMISSIONS.salesOrders },
  { path: "/refunds", permissions: PAGE_PERMISSIONS.refunds },
  { path: "/customers", permissions: PAGE_PERMISSIONS.customers },
  { path: "/cards", permissions: PAGE_PERMISSIONS.cards },
  { path: "/waitlist", permissions: PAGE_PERMISSIONS.waitlist },
  { path: "/dining-tables", permissions: PAGE_PERMISSIONS.diningTables },
  { path: "/products", permissions: PAGE_PERMISSIONS.products },
  { path: "/categories", permissions: PAGE_PERMISSIONS.categories },
  { path: "/tip-pools", permissions: PAGE_PERMISSIONS.tipPools },
  { path: "/sync", permissions: PAGE_PERMISSIONS.sync },
  { path: "/dashboard", permissions: PAGE_PERMISSIONS.dashboard },
  { path: "/sales-summary", permissions: PAGE_PERMISSIONS.salesSummary },
  { path: "/users", permissions: PAGE_PERMISSIONS.users },
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

  const isTabletAccount =
    !isFullAccess &&
    hasPermission("hospitality:room-tablet:write") &&
    !hasPermission("hospitality:spa-session:read");

  return {
    permissions,
    resolvedRoleName,
    isFullAccess,
    isTabletAccount,
    isLoading: false,
    hasPermission,
    canAccess,
  };
}
