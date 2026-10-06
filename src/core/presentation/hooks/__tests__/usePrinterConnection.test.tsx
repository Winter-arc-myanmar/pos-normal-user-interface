import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { KitchenPrintPlan } from "@/lib/printing/routeKitchenPrint";
import { savePrinterBinding } from "@/lib/pos/printerBindingStorage";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  printKitchen: vi.fn(),
}));

vi.mock("@/core/infrastructure/printing/getPrinterClient", () => ({
  getPrinterClient: async () => ({
    isConnected: () => true,
    connect: mocks.connect,
    disconnect: vi.fn(),
    findPrinters: vi.fn().mockResolvedValue([]),
    testPrint: vi.fn(),
    printKdsTicket: vi.fn(),
    printKitchen: mocks.printKitchen,
    printReceipt: vi.fn(),
  }),
}));

vi.mock("@/core/infrastructure/di/container", () => ({
  default: {
    resolve: () => ({
      list: vi.fn().mockResolvedValue({ printers: [] }),
      resolve: vi.fn().mockResolvedValue({ settings: undefined }),
    }),
  },
}));

import { usePrinterConnection } from "../usePrinterConnection";

const tenantId = "tenant-1";
const registerId = "register-1";

/** Only "salad" is routed to the drink-station printer. */
const drinkStation = {
  id: "station-drink",
  name: "KDS Drink",
  printerIds: ["printer-drink"],
  categoryIds: ["salad"],
};

const renderConnection = () =>
  renderHook(() => usePrinterConnection(tenantId, registerId));

describe("usePrinterConnection station routing", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.connect.mockReset();
    mocks.connect.mockResolvedValue(undefined);
    mocks.printKitchen.mockReset();
    mocks.printKitchen.mockResolvedValue(undefined);
    savePrinterBinding(
      tenantId,
      registerId,
      {
        id: "backend:printer-drink",
        backendPrinterId: "printer-drink",
        transport: "NETWORK",
        displayName: "Drink printer",
        sectors: ["KDS"],
        lastVerifiedAt: "",
      },
      true
    );
  });

  it("does not spray unrouted categories onto the station printer in strict mode", async () => {
    const { result } = renderConnection();
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    let plan!: KitchenPrintPlan;
    await act(async () => {
      plan = await result.current.printKitchen(
        {
          title: "KITCHEN",
          lines: [
            { name: "Coffee", quantity: "1", categoryId: "drink" },
            { name: "Pasta", quantity: "1", categoryId: "main" },
          ],
        },
        [drinkStation],
        { requireStationRouting: true }
      );
    });

    expect(plan.jobs).toEqual([]);
    expect(plan.unrouted.map((line) => line.name)).toEqual(["Coffee", "Pasta"]);
    expect(mocks.printKitchen).not.toHaveBeenCalled();
  });

  it("prints only the routed category and leaves the rest unrouted", async () => {
    const { result } = renderConnection();
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    let plan!: KitchenPrintPlan;
    await act(async () => {
      plan = await result.current.printKitchen(
        {
          title: "KITCHEN",
          lines: [
            { name: "Salad", quantity: "1", categoryId: "salad" },
            { name: "Coffee", quantity: "1", categoryId: "drink" },
          ],
        },
        [drinkStation],
        { requireStationRouting: true }
      );
    });

    expect(plan.jobs).toHaveLength(1);
    expect(plan.unrouted.map((line) => line.name)).toEqual(["Coffee"]);
    expect(mocks.printKitchen).toHaveBeenCalledTimes(1);
    const [binding, slip] = mocks.printKitchen.mock.calls[0];
    expect(binding.backendPrinterId).toBe("printer-drink");
    expect(slip.lines.map((line: { name: string }) => line.name)).toEqual([
      "Salad",
    ]);
  });

  it("falls back to the KDS printer when strict routing is not required", async () => {
    const { result } = renderConnection();
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await act(async () => {
      await result.current.printKitchen(
        {
          title: "KITCHEN",
          lines: [{ name: "Coffee", quantity: "1", categoryId: "drink" }],
        },
        [drinkStation]
      );
    });

    expect(mocks.printKitchen).toHaveBeenCalledTimes(1);
  });
});
