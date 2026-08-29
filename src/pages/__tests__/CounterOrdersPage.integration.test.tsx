import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CounterOrdersPage } from "../CounterOrdersPage";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  pickup: vi.fn(),
}));

vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    isLoading: false,
    error: null,
    getCounterOrderById: mocks.get,
    pickupCounterOrder: mocks.pickup,
  }),
}));

describe("CounterOrdersPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({
      order: {
        id: "counter-1",
        orderNumber: "C-001",
        status: "READY",
        total: "20.0000",
      },
      lines: [{ id: "line-1", productName: "Coffee", quantity: "2" }],
      kdsTickets: [{ id: "ticket-1", status: "READY" }],
    });
    mocks.pickup.mockResolvedValue({ id: "counter-1", status: "PICKED_UP" });
  });

  it("loads composite order details and confirms pickup", async () => {
    render(<CounterOrdersPage />);

    fireEvent.change(screen.getByLabelText("Counter order ID"), {
      target: { value: "counter-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find order" }));

    await screen.findByText("C-001");
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getAllByText("READY")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Confirm pickup" }));
    await waitFor(() => {
      expect(mocks.pickup).toHaveBeenCalledWith("counter-1");
      expect(mocks.get).toHaveBeenCalledTimes(2);
    });
  });
});
