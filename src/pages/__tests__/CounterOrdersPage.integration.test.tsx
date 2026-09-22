import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CounterOrdersPage } from "../CounterOrdersPage";

const ticket = {
  id: "ticket-9",
  ticketNumber: "KDS-9",
  status: "PENDING",
  courseType: "MAIN",
  firedAt: "2026-09-22T16:53:22.241Z",
  salesOrderId: "order-9",
  stationId: "station-kitchen",
};

const mocks = vi.hoisted(() => ({
  listTickets: vi.fn(),
  getTicket: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (key === "counterOrders.printTicket") return `Print ${values?.ticket}`;
      if (key === "counterOrders.queues.printJob") return `Print job (${values?.count})`;
      if (key === "counterOrders.pageLabel") {
        return `Page ${values?.page} / ${values?.pages}`;
      }
      const labels: Record<string, string> = {
        "counterOrders.queues.pending": "Waiting",
        "counterOrders.queues.preparing": "Preparing",
        "counterOrders.queues.ready": "Ready",
        "counterOrders.queues.expedited": "Expedited",
        "counterOrders.allStations": "All stations",
        "counterOrders.statuses.pending": "Pending",
        "counterOrders.refresh": "Refresh tickets",
        "counterOrders.noTickets": "No KDS tickets returned.",
      };
      return labels[key] || key;
    },
  }),
}));

vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    isLoading: false,
    error: null,
    listKdsTickets: mocks.listTickets,
    getKdsTicketById: mocks.getTicket,
  }),
}));

describe("CounterOrdersPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listTickets.mockResolvedValue({
      tickets: [ticket],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    mocks.getTicket.mockResolvedValue(ticket);
  });

  it("lists active KDS tickets and prints the selected ticket", async () => {
    const print = vi.fn();
    const originalPrint = window.print;
    window.print = print;

    render(<CounterOrdersPage />);

    expect(await screen.findByRole("button", { name: "Print KDS-9" })).toBeInTheDocument();
    expect(mocks.listTickets).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      activeOnly: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "Print KDS-9" }));
    await waitFor(() => {
      expect(mocks.getTicket).toHaveBeenCalledWith("ticket-9");
      expect(print).toHaveBeenCalled();
    });
    window.print = originalPrint;
  });

  it("loads the waiting queue by status", async () => {
    render(<CounterOrdersPage />);
    await screen.findByRole("button", { name: "Print KDS-9" });

    fireEvent.click(screen.getByRole("button", { name: "Waiting" }));

    await waitFor(() => {
      expect(mocks.listTickets).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        status: "PENDING",
      });
    });
  });
});
