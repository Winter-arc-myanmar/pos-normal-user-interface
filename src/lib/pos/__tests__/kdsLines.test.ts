import { describe, expect, it } from "vitest";
import { isPendingKdsLine, pendingKdsLines } from "../kdsLines";

describe("KDS pending lines", () => {
  it("keeps only lines which have not already been sent", () => {
    const pending = { id: "new", status: "PENDING" };
    expect(
      pendingKdsLines([
        pending,
        { id: "fired-at", status: "PENDING", firedAt: "2026-10-23T10:00:00Z" },
        { id: "fired-status", status: "FIRED" },
        { id: "kds-sent", status: "KDS_SENT" },
        { id: "ready", status: "READY" },
        { id: "voided", voidedAt: "2026-10-23T10:00:00Z" },
      ])
    ).toEqual([pending]);
  });

  it("treats a new line without a status as pending", () => {
    expect(isPendingKdsLine({})).toBe(true);
  });
});
