import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { KdsPage } from "../KdsPage";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  start: vi.fn(),
  ready: vi.fn(),
  tickets: [] as Record<string, unknown>[],
}));

const ticket = (over: Record<string, unknown> = {}) => ({
  id: "t-1",
  salesOrderId: "order-1",
  ticketNumber: "KDS-1",
  status: "PENDING",
  firedAt: new Date().toISOString(),
  kdsTicketLines: [{ id: "l-1", productName: "Ginger tea", quantity: "2.0000" }],
  ...over,
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));
vi.mock("@/core/presentation/hooks/useKdsBoard", () => ({
  useKdsBoard: () => ({
    tickets: mocks.tickets,
    error: null,
    refresh: mocks.refresh,
    start: mocks.start,
    ready: mocks.ready,
  }),
}));
vi.mock("@/core/presentation/hooks/useKdsStationManagement", () => ({
  useKdsStationManagement: () => ({ stations: [], listStations: vi.fn() }),
}));

describe("KdsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tickets = [ticket()];
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <KdsPage />
      </MemoryRouter>
    );

  it("shows a SPA room ticket, who sent it, and starts and readies it", async () => {
    mocks.tickets = [
      ticket({
        place: { kind: "SPA_ROOM", number: "S2", name: "Lotus", guestCount: 2 },
        orderNumber: "SO-12",
        sentBy: { id: "u-1", loginId: "SHW0001", name: "Aung Aung" },
        sentFrom: "STAFF",
      }),
    ];
    renderPage();
    expect(screen.getByText('kds.spaRoom {"number":"S2"}')).toBeInTheDocument();
    expect(screen.getByText(/Lotus/)).toBeInTheDocument();
    expect(screen.getByText(/SO-12/)).toBeInTheDocument();
    expect(
      screen.getByText('kds.sentBy {"name":"Aung Aung (ID: SHW0001)"}')
    ).toBeInTheDocument();
    expect(screen.getByText("Ginger tea")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "kds.start" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledWith("t-1"));
    fireEvent.click(screen.getByRole("button", { name: "kds.ready" }));
    await waitFor(() => expect(mocks.ready).toHaveBeenCalledWith("t-1"));
  });

  it("shows a table with its guests and the item's notes and seat", () => {
    mocks.tickets = [
      ticket({
        place: { kind: "TABLE", number: "T12", name: null, guestCount: 4 },
        kdsTicketLines: [
          {
            id: "l-1",
            productName: "Fried rice",
            quantity: "1.0000",
            seatNumber: 3,
            kitchenModifiers: "No chilli",
          },
        ],
      }),
    ];
    renderPage();
    expect(screen.getByText('kds.table {"number":"T12"}')).toBeInTheDocument();
    expect(screen.getByText(/kds.guests/)).toBeInTheDocument();
    expect(screen.getByText("No chilli")).toBeInTheDocument();
    expect(screen.getByText('kds.seat {"seat":3}')).toBeInTheDocument();
  });

  it("says a KTV order came from the room tablet", () => {
    mocks.tickets = [
      ticket({
        place: { kind: "KTV_ROOM", number: "K3", name: null, guestCount: null },
        sentFrom: "TABLET",
        deviceName: "K3 tablet",
      }),
    ];
    renderPage();
    expect(screen.getByText('kds.ktvRoom {"number":"K3"}')).toBeInTheDocument();
    expect(
      screen.getByText('kds.sentFromTablet {"device":"K3 tablet"}')
    ).toBeInTheDocument();
  });

  it("shows a takeaway at the counter by its pickup number", () => {
    mocks.tickets = [
      ticket({
        place: { kind: "COUNTER", number: null, name: null, guestCount: null },
        pickupNumber: "A12",
        serviceType: "TAKEAWAY",
      }),
    ];
    renderPage();
    expect(screen.getByText('kds.pickup {"number":"A12"}')).toBeInTheDocument();
    expect(screen.getByText("TAKEAWAY")).toBeInTheDocument();
  });
});
