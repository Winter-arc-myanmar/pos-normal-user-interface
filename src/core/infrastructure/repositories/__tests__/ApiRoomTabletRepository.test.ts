import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../api/HttpClient";
import { ApiRoomTabletRepository } from "../ApiRoomTabletRepository";

describe("ApiRoomTabletRepository", () => {
  it("sends the card in the body and reads the visit", async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        guest: { displayName: "Daw Hla H.", tier: "Black", discountPercent: 15, isPostpaid: true, balance: "-96500.0000" },
        rooms: [
          {
            sessionId: "session-1",
            roomNumber: "S2",
            sessionMinutes: 60,
            sessionPrice: "30000.0000",
            prepaid: true,
            spent: "51000.0000",
            orders: [
              { id: "o-1", orderNumber: 1, kind: "ITEMS", status: "PREPARING", amount: "10200.0000", items: [{ name: "Ginger tea", quantity: 2 }] },
            ],
          },
        ],
      },
    });
    const repository = new ApiRoomTabletRepository({ post } as unknown as HttpClient);

    const visit = await repository.getVisit("04C9D1E7");

    expect(post).toHaveBeenCalledWith("/api/v1/tablet/visit", { cardUid: "04C9D1E7" });
    expect(visit.guest).toMatchObject({ displayName: "Daw Hla H.", isPostpaid: true });
    expect(visit.rooms[0]).toMatchObject({ roomNumber: "S2", prepaid: true, sessionPrice: "30000.0000" });
    expect(visit.rooms[0].orders[0]).toMatchObject({ status: "PREPARING", items: [{ name: "Ginger tea", quantity: 2, refunded: false }] });
  });

  it("reads the category of each item, so its ticket can reach a station", async () => {
    const get = vi.fn().mockResolvedValue({
      data: [
        {
          id: "ro-1",
          orderNumber: 4,
          roomNumber: "S2",
          items: [
            { name: "Chinese fried noodle", quantity: 1, categoryId: "cat-chinese" },
            { name: "Beer", quantity: 2, categoryId: "cat-drinks" },
            { name: "No category item", quantity: 1 },
          ],
        },
      ],
    });
    const repository = new ApiRoomTabletRepository({ get } as unknown as HttpClient);

    const [order] = await repository.listRoomOrders(false);

    expect(order.items.map((item) => item.categoryId)).toEqual([
      "cat-chinese",
      "cat-drinks",
      null,
    ]);
  });

  it("places an order and claims a print", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: { charged: "10200.0000", balanceAfter: "89800.0000", orderNumber: 4 } })
      .mockResolvedValueOnce({ data: { claimed: true, order: { id: "ro-1", orderNumber: 4, roomNumber: "S2", items: [] } } });
    const repository = new ApiRoomTabletRepository({ post } as unknown as HttpClient);
    const payload = {
      cardUid: "04C9D1E7",
      sessionId: "session-1",
      items: [{ variantId: "v-1", quantity: 2 }],
      idempotencyKey: "k-1",
      deviceName: "Lounge 1",
    };

    const result = await repository.placeOrder(payload);
    const claim = await repository.claimRoomOrderPrint("ro-1");

    expect(post).toHaveBeenNthCalledWith(1, "/api/v1/tablet/orders", payload);
    expect(post).toHaveBeenNthCalledWith(2, "/api/v1/room-orders/ro-1/claim-print");
    expect(result).toEqual({ charged: "10200.0000", balanceAfter: "89800.0000", orderNumber: 4 });
    expect(claim.claimed).toBe(true);
  });

  /** The waiter tablet's order, exactly as the API sends it. */
  const tabletOrder = {
    id: "7b1f2c9e-4d3a-4a8e-9f1b-2c6d5e8a9b10",
    orderNumber: 12,
    source: "TABLET",
    kind: "ITEMS",
    roomKind: "KTV",
    roomNumber: "101",
    roomName: "VIP 1",
    spaSessionId: null,
    ktvSessionId: "3e9a8b7c-1d2e-4f5a-8b9c-0d1e2f3a4b5c",
    amount: "23500.0000",
    deviceName: "Waiter tablet 1",
    createdAt: "2026-11-10T13:05:12.000Z",
    acknowledgedAt: null,
    deliveredAt: null,
    printClaimedAt: "2026-11-10T13:05:13.000Z",
    items: [
      {
        name: "Fried rice",
        quantity: 1,
        status: "FIRED",
        categoryId: "a1b2c3d4-0000-4000-8000-000000000001",
        categoryName: "Food",
      },
      {
        name: "Beer",
        quantity: 2,
        status: "FIRED",
        categoryId: "a1b2c3d4-0000-4000-8000-000000000002",
        categoryName: "Drinks",
      },
    ],
  };

  it("reads the category id and name of a claimed waiter-tablet order", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      message: "Request successful",
      data: { claimed: true, order: tabletOrder },
    });
    const repository = new ApiRoomTabletRepository({ post } as unknown as HttpClient);

    const claim = await repository.claimRoomOrderPrint(tabletOrder.id);

    expect(claim.claimed).toBe(true);
    expect(claim.order.items.map((item) => item.categoryId)).toEqual([
      "a1b2c3d4-0000-4000-8000-000000000001",
      "a1b2c3d4-0000-4000-8000-000000000002",
    ]);
    expect(claim.order.items.map((item) => item.categoryName)).toEqual(["Food", "Drinks"]);
  });

  it("reads the same categories from the room-order list", async () => {
    const get = vi
      .fn()
      .mockResolvedValue({ success: true, message: "Request successful", data: [tabletOrder] });
    const repository = new ApiRoomTabletRepository({ get } as unknown as HttpClient);

    const [order] = await repository.listRoomOrders(false);

    expect(order.items.map((item) => [item.name, item.categoryId, item.categoryName])).toEqual([
      ["Fried rice", "a1b2c3d4-0000-4000-8000-000000000001", "Food"],
      ["Beer", "a1b2c3d4-0000-4000-8000-000000000002", "Drinks"],
    ]);
  });
});
