import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosWorkspaceSetupModal } from "../PosWorkspaceSetupModal";
import type { CurrentShift } from "@/core/domain/entities/Shift";

vi.mock("@/components/shift/shiftApi", () => ({
  shiftApi: () => ({ summary: () => new Promise(() => undefined) }),
  money: (value: number) => String(value),
  errorText: (_: unknown, fallback: string) => fallback,
}));

vi.mock("@/components/shift/useShiftPrinter", () => ({
  useShiftPrinter: () => vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values?.name ? `${key}:${values.name}` : key),
  }),
}));

const till = (over: Partial<CurrentShift> = {}): CurrentShift => ({
  registerId: "reg-1",
  registerName: "Front desk",
  shiftRule: "PER_LOGIN",
  sellsAt: ["BAR", "KTV", "SPA"],
  shift: null,
  dueAt: null,
  overdue: false,
  ...over,
});

const renderModal = (props: Partial<Parameters<typeof PosWorkspaceSetupModal>[0]> = {}) => {
  const handlers = { onOpenSession: vi.fn(), onShiftClosed: vi.fn(), onContinue: vi.fn() };
  render(
    <PosWorkspaceSetupModal
      open
      inventoryLocations={[{ id: "loc-1", name: "Main" } as never]}
      activeLocationId="loc-1"
      posRegisters={[{ id: "reg-1", name: "Front desk", code: "R1" } as never]}
      activePosRegisterId="reg-1"
      activePosSessionId=""
      isLoading={false}
      currentShift={till()}
      onLocationChange={vi.fn()}
      onRegisterChange={vi.fn()}
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

describe("PosWorkspaceSetupModal shifts", () => {
  it("opens a free till's shift with one tap", () => {
    const { onOpenSession } = renderModal();
    fireEvent.click(screen.getByText("shift.openButton"));
    expect(onOpenSession).toHaveBeenCalled();
  });

  it("names whoever has the till and offers to close their shift", () => {
    renderModal({
      currentShift: till({
        shift: {
          id: "shift-9",
          openedAt: "2026-10-07T08:00:00Z",
          openingCashFloat: 30000,
          cashierId: "user-9",
          cashierName: "Ma Aye",
        },
      }),
    });

    expect(screen.getByText("shift.openBy:Ma Aye")).toBeInTheDocument();
    expect(screen.getByText("shift.openButton").closest("button")).toBeDisabled();
    fireEvent.click(screen.getByText("shift.closeTheirs"));
    expect(screen.getByRole("dialog", { name: "shift.endShift" })).toBeInTheDocument();
  });

  it("stops a daily shift whose day is over until the day is closed", () => {
    const { onContinue } = renderModal({
      activePosSessionId: "shift-1",
      currentShift: till({ shiftRule: "DAILY", overdue: true, dueAt: "2026-10-07T08:00:00Z" }),
    });

    expect(screen.getByText("shift.dayOver")).toBeInTheDocument();
    fireEvent.click(screen.getByText("cashier.pos.continue"));
    expect(onContinue).not.toHaveBeenCalled();
  });
});
