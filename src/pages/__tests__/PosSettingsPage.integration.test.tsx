import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PosSettingsPage } from "../PosSettingsPage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "shell.userFallback": "User",
        "settings.tabs.cashier": "Cashier Settings",
        "settings.tabs.devices": "Devices & IP",
        "settings.tabs.printer": "Printer",
        "settings.tabs.printTemplate": "Print Template",
        "settings.tabs.posTerminal": "POS terminal",
        "settings.tabs.logout": "Logout",
        "settings.cashier.shortcutKey": "Shortcut key",
        "settings.cashier.behaviorTitle": "Cashier behavior",
        "settings.cashier.autoCheckout.title": "Auto Check Out",
        "settings.cashier.autoCheckout.description": "Auto checkout description",
        "settings.cashier.openNewOrder.title": "Open New Order After Check Out",
        "settings.cashier.openNewOrder.description": "Open new order description",
        "settings.cashier.quickOrder.title": "Quick Order",
        "settings.cashier.quickOrder.description": "Quick order description",
        "settings.cashier.priorityMemo.title": "Priority display order memo",
        "settings.cashier.priorityMemo.description": "Priority memo description",
        "settings.cashier.quickActions.soldOut": "Sold Out",
        "settings.cashier.quickActions.kitchenPrint": "Kitchen Print",
        "settings.cashier.quickActions.reserve": "Reserve",
        "settings.cashier.quickActions.seasonalItems": "Seasonal Items",
        "settings.cashier.quickActions.bookkeeping": "Bookkeeping",
        "settings.cashier.quickActions.storage": "Storage",
        "settings.cashier.quickActions.pickUp": "Pick up",
        "settings.cashier.serviceTypes.DINE_IN": "Dine In",
        "settings.cashier.serviceTypes.TAKE_AWAY": "Take Away",
        "settings.cashier.serviceTypes.DELIVERY": "Delivery",
        "settings.cashier.serviceTypes.PICK_UP": "Pick Up",
        "settings.devices.title": "Devices & IP",
        "settings.logout.title": "Sign out",
        "settings.logout.description": "End your session",
        "shell.logout": "Log out",
      };
      return labels[key] || key;
    },
  }),
}));

const logout = vi.fn();

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { name: "Demo Admin" },
    logout,
  }),
}));

function renderPage(tab = "cashier") {
  return render(
    <MemoryRouter initialEntries={[`/settings/${tab}`]}>
      <Routes>
        <Route path="/settings/:tab" element={<PosSettingsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PosSettingsPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logout.mockResolvedValue(undefined);
  });

  it("renders cashier settings and switches tabs", () => {
    renderPage("cashier");

    expect(screen.getByText("Demo Admin")).toBeInTheDocument();
    expect(screen.getByText("Auto Check Out")).toBeInTheDocument();
    expect(screen.getByText("Quick Order")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Devices & IP" }));
    expect(screen.getByRole("heading", { name: "Devices & IP" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });
});
