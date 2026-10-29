import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { KdsPage } from "../KdsPage";

const service = vi.hoisted(() => ({
  listKdsTickets: vi.fn(),
  startKdsTicket: vi.fn(),
  readyKdsTicket: vi.fn(),
}));

vi.mock("@/core/infrastructure/di/container", () => ({
  default: { resolve: () => service },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/core/presentation/hooks/useKdsStationManagement", () => ({
  useKdsStationManagement: () => ({
    stations: [],
    listStations: vi.fn().mockResolvedValue({ stations: [] }),
  }),
}));

const ticket = {
  id: "t-1",
  salesOrderId: "order-1",
  ticketNumber: "KDS-1",
  status: "PENDING",
  firedAt: new Date().toISOString(),
  kdsTicketLines: [{ id: "l-1", productName: "Ginger tea", quantity: "2.0000" }],
};

describe("KdsPage ticket action errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listKdsTickets.mockResolvedValue({ tickets: [ticket] });
  });

  it("shows the start failure and re-enables the ticket action", async () => {
    service.startKdsTicket.mockRejectedValue(new Error("Kitchen offline"));
    render(
      <MemoryRouter>
        <KdsPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "kds.start" }));

    expect(await screen.findByText("Kitchen offline")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "kds.start" })).toBeEnabled()
    );
  });
});
