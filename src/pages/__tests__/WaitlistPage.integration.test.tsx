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

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "cashier.waitingCount") {
        return `${options?.count ?? 0} active`;
      }
      if (key === "cashier.waitlist.waited") {
        return `${options?.minutes ?? 0} min waited`;
      }
      if (key === "cashier.waitlist.estimated") {
        return `~${options?.minutes ?? 0} min`;
      }
      if (key === "cashier.waitlist.tableFor") {
        return `Table for ${options?.guest ?? ""}`;
      }
      const labels: Record<string, string> = {
        "cashier.waitlistTitle": "Waitlist",
        "cashier.waitlist.addParty": "Add party",
        "cashier.waitlist.editParty": "Edit party",
        "cashier.waitlist.saveParty": "Save party",
        "cashier.waitlist.search": "Search guest or phone",
        "cashier.waitlist.guestName": "Guest name",
        "cashier.waitlist.guestPhone": "Phone",
        "cashier.partySize": "Party",
        "cashier.waitlist.estimatedWait": "Estimated wait",
        "cashier.waitlist.preferredZone": "Preferred zone",
        "cashier.waitlist.anyZone": "Any zone",
        "cashier.waitlist.notes": "Notes",
        "cashier.waitlist.chooseTable": "Choose available table",
        "cashier.notify": "Notify",
        "cashier.seat": "Seat",
        "cashier.cancel": "Cancel",
        "cashier.waitlist.tabs.waiting": "New",
        "cashier.waitlist.tabs.notified": "Processed",
        "cashier.waitlist.tabs.seated": "Seated",
        "cashier.waitlist.tabs.canceled": "Canceled",
        "cashier.waitlist.tabs.noShow": "No-show",
      };
      return labels[key] || key;
    },
  }),
}));

vi.mock("@/lib/i18n/formatters", () => ({
  useDateFormatter: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { tenantId: "tenant-1", activeBranchId: "branch-1" },
  }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({
    activePosRegisterId: "register-1",
    activePosSessionId: "session-1",
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
        joinedAt: "2026-08-24T21:27:03.805Z",
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
    fetchTableSessions: vi.fn().mockResolvedValue(undefined),
    getLatestSessionByTableId: vi.fn().mockReturnValue(undefined),
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
    mocks.create.mockResolvedValue({ id: "wait-2", status: "WAITING" });
    mocks.notify.mockResolvedValue({ id: "wait-1", status: "NOTIFIED" });
    mocks.seat.mockResolvedValue({ id: "wait-1", status: "SEATED" });
  });

  it("creates, notifies, and seats a waitlist party", async () => {
    render(<WaitlistPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add party" }));
    fireEvent.change(screen.getByLabelText("Guest name"), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "555-0200" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Add party" })[1]);

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalled();
      expect(screen.queryByLabelText("Guest name")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "John Smith" }));
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.click(screen.getByRole("option", { name: /T1/ }));
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
        posRegisterId: "register-1",
        openedByPosSessionId: "session-1",
      });
    });
  });
});
