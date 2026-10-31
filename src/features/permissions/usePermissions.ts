import { useMemo } from "react";
import type { User } from "@/core/domain/entities/User";
import { useAuth } from "@/core/presentation/hooks/useAuth";

/**
 * Permission skeleton for route/sidebar guards.
 * Adapt role names and permission keys to your backend contract.
 */
const FULL_ACCESS_ROLE = "ROOT_ADMIN";

// A menu/item is shown only when the user holds at least one of its permissions
// (`canAccess` uses `.some`). List every action (read/write/delete) for the
// module:subject so read-only users are not hidden, and no-permission users are.
export const PAGE_PERMISSIONS = {
  // Reports
  dashboard: ["reports:report:read"],
  salesSummary: ["reports:report:read"],

  // IAM
  users: ["iam:user:read", "iam:user:write", "iam:user:delete"],

  // Sales
  cashier: [
    "sales:checkout:read",
    "sales:checkout:write",
    "sales:checkout:delete",
    "pos:session:read",
    "pos:session:write",
  ],
  salesOrders: [
    "sales:sales-order:read",
    "sales:sales-order:write",
    "sales:sales-order:delete",
  ],
  counterOrders: [
    "hospitality:kds-ticket:read",
    "hospitality:kds-ticket:write",
    "sales:sales-order:read",
    "sales:sales-order:write",
  ],
  refunds: ["sales:refund:read", "sales:refund:write"],
  customers: [
    "sales:customer:read",
    "sales:customer:write",
    "sales:customer:delete",
  ],
  cards: [
    "guestcard:card:read",
    "guestcard:card:write",
    "guestcard:card:delete",
    "guestcard:wallet:read",
    "guestcard:wallet:write",
  ],

  // Hospitality
  hostesses: ["hospitality:hostess:read"],
  ktv: [
    "hospitality:ktv-session:read",
    "hospitality:ktv-session:write",
    "hospitality:ktv-room:read",
    "hospitality:ktv-room:write",
    "hospitality:ktv-room:delete",
  ],
  spa: [
    "hospitality:spa-session:read",
    "hospitality:spa-session:write",
    "hospitality:spa-room:read",
    "hospitality:spa-room:write",
    "hospitality:spa-room:delete",
  ],
  tablet: ["hospitality:room-tablet:read"],
  kds: ["hospitality:kds-ticket:read", "hospitality:kds-ticket:write"],
  waitlist: ["hospitality:waitlist:read", "hospitality:waitlist:write"],
  diningTables: [
    "hospitality:dining-table:read",
    "hospitality:dining-table:write",
    "hospitality:dining-table:delete",
  ],
  tipPools: [
    "hospitality:tip-pool:read",
    "hospitality:tip-pool:write",
    "hospitality:tip-pool:delete",
  ],

  // Catalog
  products: [
    "inventory:product:read",
    "inventory:product:write",
    "inventory:product:delete",
  ],
  categories: [
    "inventory:category:read",
    "inventory:category:write",
    "inventory:category:delete",
  ],

  // System: settings holds the profile → logout path, so it stays open.
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
    hasPermission("hospitality:room-tablet:read") &&
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
