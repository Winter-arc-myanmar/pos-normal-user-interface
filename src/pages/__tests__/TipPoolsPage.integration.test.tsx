import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipPoolsPage } from "../TipPoolsPage";

const pool = {
  id: "pool-1",
  tenantId: "tenant-1",
  locationId: "branch-1",
  name: "Dinner pool",
  periodStart: "2026-08-29T10:00:00Z",
  periodEnd: "2026-08-29T18:00:00Z",
  distributionMethod: "HOURS_WORKED",
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
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { tenantId: "tenant-1", activeBranchId: "branch-1" },
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
  });

  it("loads a pool, runs lifecycle actions, and creates an allocation", async () => {
    render(<TipPoolsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Dinner pool/ }));
    await screen.findByText("Distributable 120.0000");

    fireEvent.click(screen.getByRole("button", { name: "Distribute" }));
    await waitFor(() => expect(mocks.distribute).toHaveBeenCalledWith("pool-1"));
    fireEvent.click(screen.getByRole("button", { name: "Settle" }));

    fireEvent.change(screen.getByLabelText("Allocation user ID"), {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByLabelText("Allocation role"), {
      target: { value: "SERVER" },
    });
    fireEvent.change(screen.getByLabelText("amount"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add allocation" }));

    await waitFor(() => {
      expect(mocks.settle).toHaveBeenCalledWith("pool-1");
      expect(mocks.createAllocation).toHaveBeenCalledWith("pool-1", {
        userId: "user-1",
        role: "SERVER",
        hoursWorked: undefined,
        weight: undefined,
        amount: 25,
        notes: undefined,
      });
    });
  });
});
