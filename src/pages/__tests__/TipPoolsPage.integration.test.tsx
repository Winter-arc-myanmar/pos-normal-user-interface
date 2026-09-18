import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipPoolsPage } from "../TipPoolsPage";

const STAFF_ID = "11111111-1111-4111-8111-111111111111";

const pool = {
  id: "pool-1",
  tenantId: "tenant-1",
  locationId: "branch-1",
  name: "Dinner pool",
  periodStart: "2026-08-29T10:00:00Z",
  periodEnd: "2026-08-29T18:00:00Z",
  distributionMethod: "BY_HOURS",
  includeServiceCharge: true,
  serviceChargeShareBps: 10000,
  totalTips: "100.0000",
  totalServiceCharge: "20.0000",
  totalDistributable: "120.0000",
  status: "OPEN",
};

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  fetchPools: vi.fn(),
  fetchAllocations: vi.fn(),
  createAllocation: vi.fn(),
  distribute: vi.fn(),
  settle: vi.fn(),
  loadUsers: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        "cashier.tipPool.title": "Tip pools",
        "cashier.tipPool.addAllocation": "Add allocation",
        "cashier.tipPool.saveAllocation": "Save allocation",
        "cashier.tipPool.staff": "Staff",
        "cashier.tipPool.selectStaff": "Select staff",
        "cashier.tipPool.role": "Role",
        "cashier.tipPool.hoursWorked": "Hours worked",
        "cashier.tipPool.weight": "Weight",
        "cashier.tipPool.amount": "Amount",
        "cashier.tipPool.notes": "Notes",
        "cashier.tipPool.staffRequired": "Select a staff member.",
        "cashier.tipPool.roleRequired": "Select a role.",
        "cashier.tipPool.invalidNumber": "Enter a valid number.",
        "cashier.tipPool.valueRequired":
          "Enter hours, weight, or amount greater than zero.",
        "cashier.tipPool.createFailed": "Unable to save allocation.",
        "cashier.tipPool.distributable": "Distributable {{amount}}",
        "cashier.tipPool.distribute": "Distribute",
        "cashier.tipPool.settle": "Settle",
        "cashier.tipPool.statusAll": "ALL",
        "cashier.tipPool.statusOpen": "OPEN",
        "cashier.tipPool.statusSettled": "SETTLED",
        "cashier.tipPool.create": "Create tip pool",
        "cashier.tipPool.poolName": "Pool name",
        "cashier.tipPool.selectedPool": "Selected pool",
      };
      let text = labels[key] || key;
      if (options) {
        for (const [name, value] of Object.entries(options)) {
          if (name === "interpolation") continue;
          text = text.replace(`{{${name}}}`, String(value ?? ""));
        }
      }
      return text;
    },
  }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { tenantId: "tenant-1", activeBranchId: "branch-1" },
  }),
}));

vi.mock("@/core/presentation/hooks/useUserManagement", () => ({
  useUserManagement: () => ({
    users: [
      {
        id: STAFF_ID,
        name: "Alice Server",
        email: "alice@example.com",
        role: "STAFF",
      },
    ],
    loadUsers: mocks.loadUsers,
  }),
}));

vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    tipPools: [pool],
    tipPoolAllocations: [],
    isLoading: false,
    error: null,
    fetchTipPools: mocks.fetchPools,
    getTipPoolById: mocks.get,
    createTipPool: vi.fn(),
    updateTipPool: vi.fn(),
    distributeTipPool: mocks.distribute,
    settleTipPool: mocks.settle,
    fetchTipPoolAllocations: mocks.fetchAllocations,
    createTipPoolAllocation: mocks.createAllocation,
    updateTipPoolAllocation: vi.fn(),
    deleteTipPoolAllocation: vi.fn(),
    activeLocationId: "location-1",
    fetchInventoryLocations: vi.fn().mockResolvedValue("location-1"),
  }),
}));

describe("TipPoolsPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(pool);
    mocks.fetchPools.mockResolvedValue(undefined);
    mocks.fetchAllocations.mockResolvedValue(undefined);
    mocks.distribute.mockResolvedValue(pool);
    mocks.settle.mockResolvedValue({ ...pool, status: "SETTLED" });
    mocks.createAllocation.mockResolvedValue({ id: "allocation-1" });
    mocks.loadUsers.mockResolvedValue(undefined);
  });

  it("loads a pool, runs lifecycle actions, and creates an allocation", async () => {
    render(<TipPoolsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Dinner pool/ }));
    await screen.findByText("Distributable 120.0000");

    fireEvent.click(screen.getByRole("button", { name: "Distribute" }));
    await waitFor(() => expect(mocks.distribute).toHaveBeenCalledWith("pool-1"));
    fireEvent.click(screen.getByRole("button", { name: "Settle" }));

    fireEvent.change(screen.getByLabelText("Staff"), {
      target: { value: STAFF_ID },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add allocation" }));

    await waitFor(() => {
      expect(mocks.settle).toHaveBeenCalledWith("pool-1");
      expect(mocks.createAllocation).toHaveBeenCalledWith("pool-1", {
        userId: STAFF_ID,
        role: "SERVER",
        hoursWorked: 8,
        weight: 1,
        amount: 25,
        notes: null,
      });
    });
  });

  it("shows field errors instead of submitting invalid allocation text", async () => {
    render(<TipPoolsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Dinner pool/ }));
    await screen.findByText("Distributable 120.0000");

    fireEvent.change(screen.getByLabelText("Staff"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add allocation" }));

    expect(
      await screen.findAllByText("Select a staff member.")
    ).not.toHaveLength(0);
    expect(mocks.createAllocation).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/Request failed with status code 400/i)
    ).not.toBeInTheDocument();
  });
});
