import { describe, expect, it } from "vitest";
import { KdsTicket } from "@/core/domain/entities/Cashier";
import { defaultPrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";
import {
  KitchenSlip,
  SlipPreviewRow,
  formatKdsTicket,
  formatKitchenSlip,
  kdsTicketPlace,
  kdsTicketSender,
  kitchenSlipPreview,
} from "../formatKdsTicket";

type TextRow = Extract<SlipPreviewRow, { kind: "text" }>;

/** The rows a kitchen slip draws as text, as the printer would print them. */
const textRows = (slip: KitchenSlip): TextRow[] =>
  kitchenSlipPreview(slip).rows.filter((row): row is TextRow => row.kind === "text");

const sizeOf = (slip: KitchenSlip, text: string) =>
  textRows(slip).find((row) => row.text.includes(text))?.size;

const ticket = (fields: Partial<KdsTicket>): KdsTicket =>
  ({
    id: "ticket-1",
    ticketNumber: "KDS-0012",
    salesOrderId: "order-1",
    status: "PENDING",
    lines: [{ name: "Fried rice", quantity: "1" }],
    ...fields,
  }) as KdsTicket;

describe("the kitchen slip", () => {
  it("spaces a room ticket's items like the bill, not the kitchen", () => {
    const items = [{ name: "Beer", quantity: "2" }];
    const itemMode = (slip: string) => {
      const index = slip.indexOf("2 x BEER");
      const escape = slip.lastIndexOf("\u001b!", index);
      return slip.charCodeAt(escape + 2);
    };

    // 0x10 is the printer's double-height bit: the gap between items grows with
    // it, so a room ticket prints at the checkout bill's normal line height.
    expect(itemMode(formatKitchenSlip({ title: "0012", lines: items })) & 0x10).toBe(
      0x10
    );
    expect(
      itemMode(formatKitchenSlip({ title: "0012", room: true, lines: items })) & 0x10
    ).toBe(0);
  });

  it("says which room or table the food goes to", () => {
    expect(
      kdsTicketPlace(
        ticket({ place: { kind: "SPA_ROOM", number: "S1", name: null, guestCount: 2 } })
      )
    ).toBe("SPA S1");
    expect(
      kdsTicketPlace(
        ticket({ place: { kind: "KTV_ROOM", number: "K3", name: null, guestCount: null } })
      )
    ).toBe("KTV K3");
    expect(
      kdsTicketPlace(
        ticket({ place: { kind: "TABLE", number: "T12", name: null, guestCount: 4 } })
      )
    ).toBe("Table T12");
    expect(
      kdsTicketPlace(
        ticket({
          pickupNumber: "A12",
          place: { kind: "COUNTER", number: null, name: null, guestCount: null },
        })
      )
    ).toBe("Pickup A12");
  });

  it("names a KTV room after the tenant when the company is loaded", () => {
    const ktvRoom = ticket({
      place: { kind: "KTV_ROOM", number: "101", name: null, guestCount: null },
    });
    expect(kdsTicketPlace(ktvRoom, "Golden Club")).toBe("Golden Club 101");
    // Until the company loads, the slip still says where the food goes.
    expect(kdsTicketPlace(ktvRoom)).toBe("KTV 101");
    expect(kdsTicketPlace(ktvRoom, "   ")).toBe("KTV 101");
  });

  it("says who sent it", () => {
    expect(
      kdsTicketSender(
        ticket({ sentFrom: "STAFF", sentBy: { name: "Aung Aung", loginId: "SHW0001" } })
      )
    ).toBe("Aung Aung (ID: SHW0001)");
    expect(kdsTicketSender(ticket({ sentFrom: "TABLET", deviceName: "K3 tablet" }))).toBe(
      "K3 tablet"
    );
  });

  it("prints the room, the sender and the order number", () => {
    const text = formatKdsTicket(
      ticket({
        orderNumber: "SO-0012",
        place: { kind: "KTV_ROOM", number: "K3", name: null, guestCount: null },
        sentFrom: "STAFF",
        sentBy: { name: "Aung Aung", loginId: "SHW0001" },
      })
    );
    expect(text).toContain("KTV K3");
    expect(text).toContain("Sent by Aung Aung (ID: SHW0001)");
    expect(text).toContain("Order SO-0012");
    expect(text).toContain("1 x FRIED RICE");
  });

  it("heads a delete slip with DELETE and marks the removed item", () => {
    const text = formatKitchenSlip({
      title: "DELETE",
      stationName: "Bar",
      place: "Table T4",
      lines: [{ name: "Coffee", quantity: "1", remarks: "DELETE" }],
    });

    expect(text).toContain("BAR");
    expect(text).toContain("#DELETE");
    expect(text).toContain("1 x COFFEE");
    expect(text).toContain("** DELETE **");
  });

  it("obeys the Kitchen template Modifiers switch", () => {
    const settings = defaultPrintTemplateSettings();
    const slip = {
      title: "KDS-0012",
      lines: [
        {
          name: "Coffee",
          quantity: "1",
          modifiers: "Oat milk",
          modifierPrices: "1.5000",
        },
      ],
    };

    settings.item.modifiers = false;
    expect(formatKitchenSlip({ ...slip, template: settings })).not.toContain(
      "+ Oat milk"
    );

    settings.item.modifiers = true;
    expect(formatKitchenSlip({ ...slip, template: settings })).toContain(
      "+ Oat milk"
    );
  });
});

describe("the kitchen slip's text size switches", () => {
  const slip = (template?: ReturnType<typeof defaultPrintTemplateSettings>) => ({
    title: "KDS-0012",
    place: "KTV K3",
    lines: [{ name: "Beer", quantity: "2" }],
    ...(template ? { template } : {}),
  });

  it("prints the place at the Other text size the template asks for", () => {
    const settings = defaultPrintTemplateSettings();
    expect(sizeOf(slip(settings), "KTV K3")).toBe("normal");

    settings.item.otherTextScale = "2H2W";
    expect(sizeOf(slip(settings), "KTV K3")).toBe("huge");

    // A slip with no template keeps the built-in huge place line.
    expect(sizeOf(slip(), "KTV K3")).toBe("huge");
  });

  it("prints a room ticket's items at the Item text size the switch names", () => {
    const settings = defaultPrintTemplateSettings();
    // The settings screen leaves the old font size at the kitchen's large once
    // the switch is used; the switch is what the ticket must print.
    settings.item.itemTextScale = "1H1W";
    settings.item.fontSize = "LARGE";
    const room = { ...slip(settings), room: true };

    expect(sizeOf(room, "2 x BEER")).toBe("normal");

    settings.item.itemTextScale = "2H1W";
    expect(sizeOf(room, "2 x BEER")).toBe("tall");

    settings.item.itemTextScale = "1H2W";
    expect(sizeOf(room, "2 x BEER")).toBe("wide");
  });

  it("prints a counter ticket's items at the Item text size the switch names", () => {
    const settings = defaultPrintTemplateSettings();
    expect(sizeOf(slip(settings), "2 x BEER")).toBe("normal");

    // The settings screen leaves the old font size at the kitchen's large, so
    // Big still prints as the switch asks.
    Object.assign(settings.item, { itemTextScale: "2H2W", fontSize: "LARGE" });
    expect(sizeOf(slip(settings), "2 x BEER")).toBe("huge");

    settings.item.itemTextScale = "2H1W";
    expect(sizeOf(slip(settings), "2 x BEER")).toBe("tall");
  });
});
