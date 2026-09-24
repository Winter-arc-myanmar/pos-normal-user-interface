import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PosSettingsPage } from "../PosSettingsPage";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
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
const printerMocks = vi.hoisted(() => ({
  list: vi.fn(),
  verify: vi.fn(),
  saveBinding: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { name: "Demo Admin", tenantId: "tenant-1" },
    logout,
  }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({
    activeLocationId: "location-1",
    activePosRegisterId: "register-1",
  }),
}));

vi.mock("@/core/presentation/hooks/useKitchenPrinterManagement", () => ({
  useKitchenPrinterManagement: () => ({
    printers: [],
    isLoading: false,
    error: null,
    listPrinters: printerMocks.list,
    createPrinter: printerMocks.create,
    updatePrinter: printerMocks.update,
    deletePrinter: vi.fn(),
    attachCategory: vi.fn(),
    detachCategory: vi.fn(),
  }),
}));

vi.mock("@/core/presentation/hooks/usePrinterConnection", () => ({
  usePrinterConnection: () => ({
    bindings: [],
    defaultBinding: null,
    deviceNames: ["USB Kitchen"],
    isConnected: true,
    isConnecting: false,
    error: null,
    discover: vi.fn(),
    verify: printerMocks.verify,
    saveBinding: printerMocks.saveBinding,
    removeBinding: vi.fn(),
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
    printerMocks.list.mockResolvedValue({
      printers: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });

  it("renders cashier settings and switches tabs", () => {
    renderPage("cashier");

    expect(screen.getByText("Demo Admin")).toBeInTheDocument();
    expect(screen.getByText("Auto Check Out")).toBeInTheDocument();
    expect(screen.getByText("Quick Order")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("sends isActive true only after the printer connects", async () => {
    printerMocks.verify.mockResolvedValue({
      id: "draft-1",
      transport: "NETWORK",
      displayName: "Kitchen",
      host: "192.168.1.50",
      port: 9100,
      lastVerifiedAt: "2026-09-22T00:00:00.000Z",
    });
    printerMocks.create.mockResolvedValue({
      id: "printer-1",
      name: "Kitchen",
      ipAddress: "192.168.1.50",
      port: 9100,
    });
    renderPage("printer");

    fireEvent.change(screen.getByLabelText("settings.printer.name"), {
      target: { value: "Kitchen" },
    });
    fireEvent.change(screen.getByLabelText("settings.printer.ipAddress"), {
      target: { value: "192.168.1.50" },
    });

    fireEvent.click(screen.getByRole("button", { name: "settings.printer.save" }));

    await screen.findByText("settings.printer.saved");
    expect(printerMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Kitchen",
        ipAddress: "192.168.1.50",
        isActive: true,
      })
    );

    printerMocks.verify.mockRejectedValue(new Error("Printer offline"));
    printerMocks.update.mockResolvedValue({
      id: "printer-1",
      name: "Kitchen",
      ipAddress: "192.168.1.50",
      port: 9100,
      isActive: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "settings.printer.save" }));
    await screen.findByText("settings.printer.savedInactive");
    expect(printerMocks.update).toHaveBeenCalledWith(
      "printer-1",
      expect.objectContaining({ isActive: false })
    );
  });
});
