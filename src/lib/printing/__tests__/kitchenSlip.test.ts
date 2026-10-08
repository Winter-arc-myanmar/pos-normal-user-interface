import { describe, expect, it } from "vitest";
import { KdsTicket } from "@/core/domain/entities/Cashier";
import { formatKdsTicket, kdsTicketPlace, kdsTicketSender } from "../formatKdsTicket";

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
  it("says which room or table the food goes to", () => {
    expect(
      kdsTicketPlace(
        ticket({ place: { kind: "SPA_ROOM", number: "S1", name: null, guestCount: 2 } })
      )
    ).toBe("SPA room S1 (2 guests)");
    expect(
      kdsTicketPlace(
        ticket({ place: { kind: "KTV_ROOM", number: "K3", name: null, guestCount: null } })
      )
    ).toBe("KTV room K3");
    expect(
      kdsTicketPlace(
        ticket({ place: { kind: "TABLE", number: "T12", name: null, guestCount: 4 } })
      )
    ).toBe("Table T12 (4 guests)");
    expect(
      kdsTicketPlace(
        ticket({
          pickupNumber: "A12",
          place: { kind: "COUNTER", number: null, name: null, guestCount: null },
        })
      )
    ).toBe("Pickup A12");
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
    expect(text).toContain("KTV room K3");
    expect(text).toContain("Sent by: Aung Aung (ID: SHW0001)");
    expect(text).toContain("Sales order: SO-0012");
    expect(text).toContain("Fried rice");
  });
});
