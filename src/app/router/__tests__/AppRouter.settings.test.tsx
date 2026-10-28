import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRouter } from "../AppRouter";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false, user: null }),
}));

vi.mock("@/features/permissions/usePermissions", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/permissions/usePermissions")
    >();
  return {
    ...actual,
    usePermissions: () => ({ canAccess: () => true, isTabletAccount: false }),
  };
});

vi.mock("@/widgets/layout/AppShell", async () => {
  const { Outlet } = await import("react-router-dom");
  return { AppShell: () => <Outlet /> };
});

vi.mock("@/pages/PosSettingsPage", async () => {
  const { useLocation } = await import("react-router-dom");
  return {
    PosSettingsPage: () => {
      const location = useLocation();
      return <output>{location.pathname}</output>;
    },
  };
});

describe("AppRouter settings", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("opens the real default settings tab for a bare /settings URL", async () => {
    window.history.pushState({}, "", "/settings");

    render(<AppRouter />);

    expect(await screen.findByText("/settings/devices")).toBeInTheDocument();
  });
});
