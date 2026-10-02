import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AppShell } from "../AppShell";

const mocks = vi.hoisted(() => ({
  setActiveBranch: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../RoomOrderAlerts", () => ({
  RoomOrderAlerts: () => null,
}));

vi.mock("@/components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <button type="button">Language</button>,
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      name: "Cashier",
      activeBranchId: "branch-one",
      branchAccess: [
        { branchId: "branch-one", roles: [], permissions: [] },
        { branchId: "branch-two", roles: [], permissions: [] },
      ],
    },
    logout: vi.fn(),
    setActiveBranch: mocks.setActiveBranch,
  }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({ activePosRegisterId: "register-1" }),
}));

vi.mock("@/core/presentation/hooks/usePrinterConnection", () => ({
  usePrinterConnection: () => ({
    defaultBinding: { id: "printer-1" },
    error: null,
  }),
}));

vi.mock("@/features/permissions/usePermissions", () => ({
  PAGE_PERMISSIONS: {
    dashboard: [],
    cashier: [],
    users: [],
    customers: [],
  },
  usePermissions: () => ({ canAccess: () => true }),
}));

function LocationDisplay() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

describe("AppShell POS actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setActiveBranch.mockResolvedValue(undefined);
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("switches branches and routes Menu to the product catalog", async () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=pay"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<LocationDisplay />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("shell.branch"), {
      target: { value: "branch-two" },
    });

    await waitFor(() =>
      expect(mocks.setActiveBranch).toHaveBeenCalledWith("branch-two")
    );

    fireEvent.click(screen.getByRole("button", { name: "shell.menu" }));
    expect(screen.getByText("/cashier?view=menu")).toBeInTheDocument();
  });

  it("expands the side menu and shows page labels", () => {
    render(
      <MemoryRouter initialEntries={["/cashier?view=menu"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<LocationDisplay />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const toggle = screen.getByRole("button", { name: "shell.expandSidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: "shell.collapseSidebar" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("shell.cashierTitle")).toBeInTheDocument();
    expect(screen.getByText("shell.mainMenu")).toBeInTheDocument();
    expect(document.getElementById("pos-side-menu")).toHaveClass(
      "transition-[width,padding]"
    );
  });

  it("opens an overlay menu on small screens", () => {
    window.innerWidth = 390;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: String(query).includes("767"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <MemoryRouter initialEntries={["/cashier?view=menu"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<LocationDisplay />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "shell.openMenu" }));
    expect(screen.getByRole("navigation", { name: "shell.mainMenu" })).toBeVisible();
    expect(document.querySelector(".pos-side-drawer")).toHaveClass("translate-x-0");
    expect(document.querySelector(".pos-nav-backdrop")).toHaveClass("opacity-100");
    fireEvent.click(screen.getByRole("button", { name: "shell.closeMenu" }));
    expect(document.querySelector(".pos-side-drawer")).toHaveClass("-translate-x-full");
    expect(document.querySelector(".pos-nav-backdrop")).toHaveClass("opacity-0");
    expect(screen.getByRole("button", { name: "shell.openMenu" })).toBeInTheDocument();
  });
});
