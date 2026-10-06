import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloseShiftDialog } from "../CloseShiftDialog";

const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  close: vi.fn(),
  approve: vi.fn(),
}));

vi.mock("../shiftApi", () => ({
  shiftApi: () => mocks,
  money: (value: number) => String(value),
  errorText: (caught: unknown, fallback: string) =>
    caught instanceof Error ? caught.message : fallback,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values?.amount ? `${key}:${values.amount}` : key,
  }),
}));

const summary = (over: Record<string, unknown> = {}) => ({
  sessionId: "shift-1",
  registerName: "Front desk",
  cashierName: "Ma Aye",
  openedAt: "2026-10-07T08:00:00Z",
  closedAt: null,
  openingCashFloat: 50000,
  expectedClosingCash: 120000,
  actualClosingCash: null,
  cashVariance: null,
  totalSales: 70000,
  totalRefunds: 0,
  netTotal: 70000,
  salesCount: 4,
  refundCount: 0,
  nonSalesCashIn: 0,
  nonSalesCashOut: 0,
  paymentBreakdown: [],
  ...over,
});

const count = (amount: string) =>
  fireEvent.change(screen.getByLabelText("shift.counted"), { target: { value: amount } });

describe("CloseShiftDialog", () => {
  const onClosed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.summary.mockResolvedValue(summary());
  });

  it("counts blind, then closes a drawer that matches without a manager", async () => {
    mocks.close.mockResolvedValue(summary({ actualClosingCash: 120000, cashVariance: 0 }));
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    expect(screen.queryByText("120000")).not.toBeInTheDocument();
    count("120000");
    fireEvent.click(screen.getByText("shift.next"));

    expect(await screen.findByText("shift.exact")).toBeInTheDocument();
    expect(screen.queryByLabelText("shift.managerId")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("shift.closeButton"));

    await waitFor(() => expect(mocks.close).toHaveBeenCalledWith("shift-1", 120000, undefined));
    expect(mocks.approve).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByText("shift.done"));
    expect(onClosed).toHaveBeenCalled();
  });

  it("needs a manager's own login when the drawer is short, and sends their approval", async () => {
    mocks.approve.mockResolvedValue({ token: "approval-token", approverName: "U Kyaw" });
    mocks.close.mockResolvedValue(summary({ actualClosingCash: 115000, cashVariance: -5000 }));
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    count("115000");
    fireEvent.click(screen.getByText("shift.next"));
    expect(await screen.findByText("shift.short:5000")).toBeInTheDocument();

    const approve = screen.getByText("shift.approve").closest("button")!;
    expect(approve).toBeDisabled();
    fireEvent.change(screen.getByLabelText("shift.managerId"), { target: { value: "MGR0001" } });
    fireEvent.change(screen.getByLabelText("shift.managerPassword"), { target: { value: "secret" } });
    fireEvent.click(approve);

    await waitFor(() =>
      expect(mocks.close).toHaveBeenCalledWith("shift-1", 115000, "approval-token")
    );
    expect(mocks.approve).toHaveBeenCalledWith("MGR0001", "secret", "pos:cash-variance:approve");
  });

  it("shows why the manager's login was refused and keeps the count", async () => {
    mocks.approve.mockRejectedValue(new Error("Wrong User ID or password"));
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    count("100000");
    fireEvent.click(screen.getByText("shift.next"));
    await screen.findByText("shift.short:20000");
    fireEvent.change(screen.getByLabelText("shift.managerId"), { target: { value: "MGR0001" } });
    fireEvent.change(screen.getByLabelText("shift.managerPassword"), { target: { value: "nope" } });
    fireEvent.click(screen.getByText("shift.approve"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong User ID or password");
    expect(mocks.close).not.toHaveBeenCalled();
  });
});
