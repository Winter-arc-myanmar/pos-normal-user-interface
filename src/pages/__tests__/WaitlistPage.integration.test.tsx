import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistPage } from "../WaitlistPage";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  notify: vi.fn(),
  seat: vi.fn(),
  fetchWaitlist: vi.fn(),
  fetchTables: vi.fn(),
  fetchZones: vi.fn(),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { tenantId: "tenant-1", activeBranchId: "branch-1" },
  }),
}));

vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    waitlistEntries: [
      {
        id: "wait-1",
        guestName: "John Smith",
        guestPhone: "+1-555-0100",
        partySize: 2,
        estimatedWaitMins: 20,
        status: "WAITING",
      },
    ],
    diningTables: [
      {
        id: "table-1",
        tableNumber: "T1",
        maxSeats: 4,
        status: "AVAILABLE",
      },
    ],
    diningZones: [{ id: "zone-1", name: "Patio" }],
    isLoading: false,
    error: null,
    fetchWaitlist: mocks.fetchWaitlist,
    fetchDiningTables: mocks.fetchTables,
    fetchDiningZones: mocks.fetchZones,
    createWaitlistEntry: mocks.create,
    updateWaitlistEntry: vi.fn(),
    notifyWaitlistEntry: mocks.notify,
    seatWaitlistEntry: mocks.seat,
    cancelWaitlistEntry: vi.fn(),
    noShowWaitlistEntry: vi.fn(),
    activeLocationId: "location-1",
    fetchInventoryLocations: vi.fn().mockResolvedValue("location-1"),
  }),
}));

describe("WaitlistPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchWaitlist.mockResolvedValue(undefined);
    mocks.fetchTables.mockResolvedValue(undefined);
    mocks.fetchZones.mockResolvedValue(undefined);
    mocks.create.mockResolvedValue({ id: "wait-2" });
    mocks.notify.mockResolvedValue({ id: "wait-1", status: "NOTIFIED" });
    mocks.seat.mockResolvedValue({ id: "wait-1", status: "SEATED" });
  });

  it("creates, notifies, and seats a waitlist party", async () => {
    render(<WaitlistPage />);

    fireEvent.change(screen.getByLabelText("Guest name"), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText("Guest phone"), {
      target: { value: "555-0200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to waitlist" }));

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.change(screen.getByLabelText("Table for John Smith"), {
      target: { value: "table-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Seat" }));

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          locationId: "location-1",
          guestName: "Jane Doe",
          guestPhone: "555-0200",
          partySize: 2,
        })
      );
      expect(mocks.notify).toHaveBeenCalledWith("wait-1");
      expect(mocks.seat).toHaveBeenCalledWith("wait-1", {
        tableId: "table-1",
        guestCount: 2,
      });
    });
  });
});
