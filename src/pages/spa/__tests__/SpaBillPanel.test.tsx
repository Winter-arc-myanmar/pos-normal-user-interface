import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpaRoom, SpaSession, SpaSessionQuote } from "@/core/domain/entities/Spa";
import { SpaBillPanel } from "../SpaBillPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { exists: () => false },
  }),
}));

const room = new SpaRoom({
  id: "room-102",
  roomNumber: "102",
  name: "VIP 102",
  minimumMinutes: 60,
  status: "OCCUPIED",
});
const session = new SpaSession({
  id: "session-1",
  roomId: "room-102",
  salesOrderId: "order-1",
  guestCount: 1,
  openedAt: "2026-10-30T12:16:00.000Z",
  plannedMinutes: 60,
  sessionState: "OPEN",
});
const quote = new SpaSessionQuote({
  sessionId: "session-1",
  roomId: "room-102",
  roomNumber: "102",
  state: "OPEN",
  openedAt: "2026-10-30T12:16:00.000Z",
  asOf: "2026-10-30T13:15:00.000Z",
  elapsedMinutes: 59,
  pausedMinutes: 0,
  treatmentCharge: "40000.0000",
  servicesCharge: "75000.0000",
  runningTotal: "115000.0000",
  prepaid: false,
  paidTotal: "0.0000",
  paymentTiming: "PAY_AT_END",
});

const renderPanel = (overrides: Record<string, unknown> = {}) => {
  const onOpenBill = vi.fn();
  const onTogglePause = vi.fn();
  const onExtend = vi.fn();
  const onPrimary = vi.fn();
  render(
    <SpaBillPanel
      kind="ktv"
      room={room}
      session={session}
      card={null}
      wallet={null}
      quote={quote}
      lines={[]}
      itemNames={{}}
      nowMs={new Date("2026-10-30T13:15:00.000Z").getTime()}
      isBusy={false}
      billClosed={false}
      primaryLabel="spa.pay"
      onPrimary={onPrimary}
      onTogglePause={onTogglePause}
      onOpenBill={onOpenBill}
      onChangeQuantity={vi.fn()}
      onAddAnother={vi.fn()}
      onRemoveLine={vi.fn()}
      pending={[]}
      onPendingChange={vi.fn()}
      onClearPending={vi.fn()}
      onCommitPending={vi.fn()}
      onToggleFoc={vi.fn()}
      onChangeCard={vi.fn()}
      onExtend={onExtend}
      {...overrides}
    />
  );
  return { onOpenBill, onTogglePause, onExtend, onPrimary };
};

describe("SpaBillPanel actions", () => {
  it("puts Bill & table beside Pause, Extend and the close button", () => {
    const { onOpenBill, onTogglePause, onExtend, onPrimary } = renderPanel();

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.billOptions.titleWithTable" })
    );
    expect(onOpenBill).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "spa.pause" }));
    expect(onTogglePause).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "spa.extend" }));
    expect(onExtend).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "spa.pay" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("keeps the old row when the bill cannot be adjusted", () => {
    renderPanel({ onOpenBill: undefined });

    expect(
      screen.queryByRole("button", { name: "cashier.billOptions.titleWithTable" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "spa.pause" })).toBeInTheDocument();
  });

  it("hides the action row once the bill is closed", () => {
    renderPanel({ billClosed: true });

    expect(
      screen.queryByRole("button", { name: "cashier.billOptions.titleWithTable" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("spa.billClosed")).toBeInTheDocument();
  });
});
