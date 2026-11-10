import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { Product } from "@/core/domain/entities/Cashier";
import type { RoomOrderView } from "@/core/domain/entities/RoomTablet";

const mocks = vi.hoisted(() => ({ getProducts: vi.fn() }));

vi.mock("@/core/infrastructure/di/container", () => ({
  default: {
    resolve: () => ({ getProducts: mocks.getProducts }),
  },
}));

import { useRoomOrderCategories } from "../useRoomOrderCategories";

const order = (items: RoomOrderView["items"]): RoomOrderView => ({
  id: "ro-1",
  orderNumber: 4,
  source: "TABLET",
  kind: "ITEMS",
  roomNumber: "S2",
  roomName: null,
  spaSessionId: "session-1",
  amount: "12000",
  deviceName: "Lounge 1",
  createdAt: "2026-11-10T12:00:00.000Z",
  acknowledgedAt: null,
  deliveredAt: null,
  printClaimedAt: null,
  items,
});

describe("useRoomOrderCategories", () => {
  beforeEach(() => {
    mocks.getProducts.mockReset();
    mocks.getProducts.mockResolvedValue([
      new Product({ id: "p1", name: "Rice", categoryId: "cat-kitchen" }),
      new Product({ id: "p2", name: "Tiger Beer", categoryId: "cat-bar" }),
    ]);
  });

  it("fills the category the room order did not carry", async () => {
    const { result } = renderHook(() => useRoomOrderCategories());

    const enriched = await result.current(
      order([
        { name: "Rice", quantity: 1, status: "PENDING" },
        { name: "Tiger Beer", quantity: 2, status: "PENDING" },
      ])
    );

    expect(enriched.items.map((item) => item.categoryId)).toEqual([
      "cat-kitchen",
      "cat-bar",
    ]);
  });

  it("keeps the category the API did send, without reading the menu", async () => {
    const { result } = renderHook(() => useRoomOrderCategories());

    const enriched = await result.current(
      order([{ name: "Rice", quantity: 1, status: "PENDING", categoryId: "cat-api" }])
    );

    expect(enriched.items[0].categoryId).toBe("cat-api");
    expect(mocks.getProducts).not.toHaveBeenCalled();
  });

  it("leaves an unknown name without a category, and still prints the order", async () => {
    const { result } = renderHook(() => useRoomOrderCategories());

    const enriched = await result.current(
      order([{ name: "Mystery dish", quantity: 1, status: "PENDING" }])
    );

    expect(enriched.items[0].categoryId).toBeNull();
  });

  it("survives a menu it cannot read", async () => {
    mocks.getProducts.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useRoomOrderCategories());

    const enriched = await result.current(
      order([{ name: "Rice", quantity: 1, status: "PENDING" }])
    );

    expect(enriched.items[0].categoryId).toBeNull();
  });

  it("reads the menu once per session", async () => {
    const { result } = renderHook(() => useRoomOrderCategories());

    await result.current(order([{ name: "Rice", quantity: 1, status: "PENDING" }]));
    await result.current(order([{ name: "Tiger Beer", quantity: 1, status: "PENDING" }]));

    await waitFor(() => expect(mocks.getProducts).toHaveBeenCalledTimes(1));
  });
});
