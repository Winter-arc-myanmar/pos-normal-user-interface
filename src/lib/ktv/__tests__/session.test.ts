import { describe, expect, it } from "vitest";
import { KtvRoom, KtvSession } from "@/core/domain/entities/Ktv";
import {
  findActiveKtvSession,
  getKtvWarning,
  hasSufficientWalletBalance,
} from "../session";

describe("KTV session helpers", () => {
  it("selects the latest open room session", () => {
    const room = new KtvRoom({
      id: "room-1",
      sessions: [
        new KtvSession({
          id: "closed",
          openedAt: "2026-09-21T10:00:00Z",
          sessionState: "CLOSED",
        }),
        new KtvSession({
          id: "open",
          openedAt: "2026-09-21T11:00:00Z",
          sessionState: "OPEN",
        }),
      ],
    });

    expect(findActiveKtvSession(room)?.id).toBe("open");
  });

  it("uses orange warning in the last 15 minutes and red after expiry", () => {
    const now = new Date("2026-09-21T12:00:00Z").getTime();
    expect(getKtvWarning("2026-09-21T12:15:00Z", now).level).toBe("WARNING");
    expect(getKtvWarning("2026-09-21T11:59:00Z", now).level).toBe("EXPIRED");
    expect(getKtvWarning("2026-09-21T12:30:00Z", now).level).toBe("NORMAL");
  });

  it("checks order total against wallet balance", () => {
    expect(hasSufficientWalletBalance("100.0000", "99.9999")).toBe(true);
    expect(hasSufficientWalletBalance("100.0000", "100.1000")).toBe(false);
  });
});
