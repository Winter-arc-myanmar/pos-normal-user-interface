import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PAGE_PERMISSIONS, usePermissions } from "../usePermissions";

const auth = vi.hoisted(() => ({ user: null as unknown }));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: auth.user }),
}));

const staff = (permissions: string[]) => ({
  id: "user-1",
  role: "STAFF",
  adminRoleName: "",
  permissions,
});

describe("page permissions", () => {
  it("needs a checkout permission for the till, not just a POS session", () => {
    auth.user = staff(["pos:session:read", "pos:session:write"]);
    const sessionOnly = renderHook(() => usePermissions());
    expect(sessionOnly.result.current.canAccess(PAGE_PERMISSIONS.cashier)).toBe(
      false
    );

    auth.user = staff(["sales:checkout:read"]);
    const checkout = renderHook(() => usePermissions());
    expect(checkout.result.current.canAccess(PAGE_PERMISSIONS.cashier)).toBe(true);
    expect(checkout.result.current.hasPermission("sales:checkout:write")).toBe(
      false
    );
  });

  it("keeps full access for an admin", () => {
    auth.user = { id: "user-2", role: "ADMIN", adminRoleName: "ADMIN", permissions: [] };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canAccess(PAGE_PERMISSIONS.cashier)).toBe(true);
  });
});
