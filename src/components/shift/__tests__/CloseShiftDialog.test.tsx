import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloseShiftDialog } from "../CloseShiftDialog";

const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  close: vi.fn(),
}));

vi.mock("../shiftApi", () => ({
  shiftApi: () => mocks,
  money: (value: number) => String(value),
  errorText: (caught: unknown, fallback: string) =>
    caught instanceof Error ? caught.message : fallback,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const summary = (over: Record<string, unknown> = {}) => ({
  sessionId: "shift-1",
  registerName: "Front desk",
  cashierName: "Ma Aye",
  openedAt: "2026-10-07T08:00:00Z",
  closedAt: null,
  openingCashFloat: 0,
  expectedClosingCash: 0,
  actualClosingCash: null,
  cashVariance: null,
  totalSales: 70000,
  totalRefunds: 5000,
  netTotal: 65000,
  salesCount: 4,
  refundCount: 1,
  nonSalesCashIn: 0,
  nonSalesCashOut: 0,
  paymentBreakdown: [
    { methodName: "Cash", transactionCount: 3, totalAmount: 40000 },
    { methodName: "KBZPay", transactionCount: 1, totalAmount: 30000 },
  ],
  ...over,
});

describe("CloseShiftDialog", () => {
  const onClosed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.summary.mockResolvedValue(summary());
  });

  it("shows who sold how much, by payment type, before closing", async () => {
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    expect(await screen.findByText("Ma Aye")).toBeInTheDocument();
    expect(screen.getByText("65000")).toBeInTheDocument();
    expect(screen.getByText("shift.byPayment")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("40000")).toBeInTheDocument();
    expect(screen.getByText("KBZPay")).toBeInTheDocument();
    expect(screen.getByText("30000")).toBeInTheDocument();
    expect(mocks.close).not.toHaveBeenCalled();
  });

  it("closes the shift without counting the drawer and hands back the report", async () => {
    mocks.close.mockResolvedValue(summary({ closedAt: "2026-10-07T16:00:00Z" }));
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    await screen.findByText("Ma Aye");
    fireEvent.click(screen.getByRole("button", { name: "shift.endShift" }));

    await waitFor(() => expect(mocks.close).toHaveBeenCalledWith("shift-1"));
    fireEvent.click(await screen.findByText("shift.done"));
    expect(onClosed).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "shift-1" }));
  });

  it("says why a shift could not be closed", async () => {
    mocks.close.mockRejectedValue(new Error("This shift is closed."));
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    await screen.findByText("Ma Aye");
    fireEvent.click(screen.getByRole("button", { name: "shift.endShift" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This shift is closed.");
    expect(onClosed).not.toHaveBeenCalled();
  });
});
