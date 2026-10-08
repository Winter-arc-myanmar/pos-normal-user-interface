import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RoomOrderAlerts } from "../RoomOrderAlerts";

const mocks = vi.hoisted(() => ({
  listRoomOrders: vi.fn(),
  claimRoomOrderPrint: vi.fn(),
  acknowledgeRoomOrder: vi.fn(),
  deliverRoomOrder: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/core/infrastructure/di/container", () => ({
  default: { resolve: () => mocks },
}));

const order = {
  id: "ro-1",
  orderNumber: 3,
  source: "TABLET",
  kind: "ITEMS",
  roomNumber: "S2",
  roomName: null,
  spaSessionId: "session-1",
  amount: "10200.0000",
  deviceName: "Lounge 1",
  createdAt: "2026-09-26T08:00:00Z",
  acknowledgedAt: null,
  deliveredAt: null,
  printClaimedAt: null,
  items: [{ name: "Ginger tea", quantity: 2, status: "FIRED" }],
};

describe("RoomOrderAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRoomOrders.mockResolvedValue([order]);
    mocks.claimRoomOrderPrint.mockResolvedValue({ claimed: true, order });
  });

  it("keeps the printing choice collapsed in the rail instead of over bottom actions", async () => {
    window.localStorage.setItem("print-tablet-orders", "false");
    const { container } = render(
      <>
        <div id="pos-tablet-print-settings" />
        <RoomOrderAlerts enabled printKitchen={vi.fn()} />
      </>
    );
    await screen.findByText(/roomOrders.newOrder/);
    const settings = container.querySelector("#pos-tablet-print-settings details");
    expect(settings).toBeInTheDocument();
    expect(settings).not.toHaveAttribute("open");
    expect(container.querySelector("aside input[type=checkbox]")).toBeNull();
    settings!.setAttribute("open", "");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(window.localStorage.getItem("print-tablet-orders")).toBe("true");
  });

  it("alerts staff and prints the ticket once on the printing terminal", async () => {
    window.localStorage.setItem("print-tablet-orders", "true");
    const printKitchen = vi.fn().mockResolvedValue([]);
    render(<RoomOrderAlerts enabled printKitchen={printKitchen} />);

    expect(await screen.findByText(/roomOrders.newOrder/)).toBeInTheDocument();
    await waitFor(() => expect(printKitchen).toHaveBeenCalledTimes(1));
    expect(printKitchen).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Room order 3",
        place: "Room S2",
        lines: [{ name: "Ginger tea", quantity: "2" }],
      })
    );
  });

  it("does not print when this terminal is not the printing one", async () => {
    window.localStorage.setItem("print-tablet-orders", "false");
    const printKitchen = vi.fn();
    render(<RoomOrderAlerts enabled printKitchen={printKitchen} />);
    expect(await screen.findByText(/roomOrders.newOrder/)).toBeInTheDocument();
    expect(mocks.claimRoomOrderPrint).not.toHaveBeenCalled();
    expect(printKitchen).not.toHaveBeenCalled();
  });

  it("does not print a ticket another terminal claimed", async () => {
    window.localStorage.setItem("print-tablet-orders", "true");
    mocks.claimRoomOrderPrint.mockResolvedValue({ claimed: false, order });
    const printKitchen = vi.fn();
    render(<RoomOrderAlerts enabled printKitchen={printKitchen} />);
    await waitFor(() => expect(mocks.claimRoomOrderPrint).toHaveBeenCalled());
    expect(printKitchen).not.toHaveBeenCalled();
  });
});
