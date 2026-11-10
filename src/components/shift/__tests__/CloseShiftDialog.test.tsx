import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloseShiftDialog } from "../CloseShiftDialog";

const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  close: vi.fn(),
  printShift: vi.fn(),
}));

vi.mock("../useShiftPrinter", () => ({
  useShiftPrinter: () => mocks.printShift,
}));

vi.mock("../shiftApi", () => ({
  shiftApi: () => mocks,
  money: (value: number) => String(value),
  errorText: (caught: unknown, fallback: string) =>
    caught instanceof Error ? caught.message : fallback,
}));

vi.mock("react-i18next", () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

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
    // A shift closes on the second, deliberate tap only.
    expect(mocks.close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "shift.confirmCloseYes" }));

    await waitFor(() => expect(mocks.close).toHaveBeenCalledWith("shift-1"));
    // The print question is asked first; answering it brings the shift's end.
    fireEvent.click(await screen.findByRole("button", { name: "shift.askPrintNo" }));
    fireEvent.click(await screen.findByText("shift.done"));
    expect(onClosed).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "shift-1" }));
  });

  it("asks a second time before it closes the shift", async () => {
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    await screen.findByText("Ma Aye");
    fireEvent.click(screen.getByRole("button", { name: "shift.endShift" }));

    const confirm = screen.getByRole("alertdialog");
    expect(confirm).toHaveTextContent("shift.confirmCloseTitle");
    expect(confirm).toHaveTextContent("shift.confirmCloseBody");
    expect(mocks.close).not.toHaveBeenCalled();

    // Back leaves the shift open, exactly as it was.
    fireEvent.click(screen.getByRole("button", { name: "shift.confirmBack" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "shift.endShift" })).toBeInTheDocument();
    expect(mocks.close).not.toHaveBeenCalled();
  });

  it("says why a shift could not be closed", async () => {
    mocks.close.mockRejectedValue(new Error("This shift is closed."));
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    await screen.findByText("Ma Aye");
    fireEvent.click(screen.getByRole("button", { name: "shift.endShift" }));
    fireEvent.click(screen.getByRole("button", { name: "shift.confirmCloseYes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This shift is closed.");
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("prints the report on the till's printer, not the browser's", async () => {
    const closed = summary({ closedAt: "2026-10-07T16:00:00Z" });
    mocks.close.mockResolvedValue(closed);
    mocks.printShift.mockResolvedValue(undefined);
    const browserPrint = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    await screen.findByText("Ma Aye");
    fireEvent.click(screen.getByRole("button", { name: "shift.endShift" }));
    fireEvent.click(screen.getByRole("button", { name: "shift.confirmCloseYes" }));
    // The till asks for the report as soon as the shift is closed.
    fireEvent.click(await screen.findByRole("button", { name: "shift.askPrintYes" }));

    await waitFor(() => expect(mocks.printShift).toHaveBeenCalledWith(closed));
    expect(browserPrint).not.toHaveBeenCalled();
  });

  it("asks whether to print once the shift is closed", async () => {
    mocks.close.mockResolvedValue(summary({ closedAt: "2026-10-07T16:00:00Z" }));
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    await screen.findByText("Ma Aye");
    fireEvent.click(screen.getByRole("button", { name: "shift.endShift" }));
    fireEvent.click(screen.getByRole("button", { name: "shift.confirmCloseYes" }));

    const ask = await screen.findByRole("alertdialog");
    expect(ask).toHaveTextContent("shift.askPrintTitle");
    expect(ask).toHaveTextContent("shift.askPrintBody");
    expect(mocks.printShift).not.toHaveBeenCalled();

    // "No" leaves the paper alone; the report can still be printed by hand.
    fireEvent.click(screen.getByRole("button", { name: "shift.askPrintNo" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.printShift).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "shift.print" })).toBeInTheDocument();
  });

  it("says when the printer could not print the report", async () => {
    mocks.close.mockResolvedValue(summary({ closedAt: "2026-10-07T16:00:00Z" }));
    mocks.printShift.mockRejectedValue(new Error("No checkout printer is connected"));
    render(<CloseShiftDialog sessionId="shift-1" title="shift.endShift" onClosed={onClosed} />);

    await screen.findByText("Ma Aye");
    fireEvent.click(screen.getByRole("button", { name: "shift.endShift" }));
    fireEvent.click(screen.getByRole("button", { name: "shift.confirmCloseYes" }));
    fireEvent.click(await screen.findByRole("button", { name: "shift.askPrintYes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No checkout printer is connected");
  });
});
