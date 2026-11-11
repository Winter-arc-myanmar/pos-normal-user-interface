import { describe, expect, it } from "vitest";
import { buildKitchenSlipLines } from "@/lib/printing/formatKdsTicket";
import { toTabletSlip } from "../tabletSlip";

describe("a room order's kitchen slip", () => {
  it("prints the item's variant, options and note", () => {
    const slip = toTabletSlip({
      id: "ro-1",
      orderNumber: 4,
      source: "TABLET",
      kind: "ITEMS",
      roomNumber: "S2",
      roomName: "Lotus",
      spaSessionId: "s-1",
      amount: "10200.0000",
      deviceName: "Lounge 1",
      createdAt: "2026-11-11T10:00:00.000Z",
      acknowledgedAt: null,
      deliveredAt: null,
      printClaimedAt: null,
      items: [
        {
          name: "Coffee (Large)",
          quantity: 1,
          status: "PENDING",
          categoryId: "cat-drinks",
          modifiers: "Oat milk",
          modifierPrices: "1.5000",
          note: "No sugar",
        },
      ],
    });

    const printed = buildKitchenSlipLines(slip).join("\n");

    expect(printed).toContain("COFFEE (LARGE)");
    expect(printed).toContain("+ Oat milk");
    expect(printed).toContain("** No sugar **");
  });
});