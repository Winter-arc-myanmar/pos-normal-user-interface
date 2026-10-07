import { describe, expect, it } from "vitest";
import { hiddenPosScreen } from "../posScreens";

describe("POS device screens", () => {
  it("sends a SPA device away from the restaurant till to its own board", () => {
    expect(hiddenPosScreen("/cashier", ["SPA"])).toBe("/spa");
    expect(hiddenPosScreen("/ktv/room/7", ["SPA"])).toBe("/spa");
  });

  it("leaves a device on its own screens and on shared ones", () => {
    expect(hiddenPosScreen("/spa", ["SPA"])).toBeNull();
    expect(hiddenPosScreen("/sales-orders", ["SPA"])).toBeNull();
    expect(hiddenPosScreen("/settings/shift", ["KTV"])).toBeNull();
  });

  it("lets a combined device use every screen it sells at", () => {
    expect(hiddenPosScreen("/cashier", ["BAR", "KTV"])).toBeNull();
    expect(hiddenPosScreen("/ktv", ["BAR", "KTV"])).toBeNull();
    expect(hiddenPosScreen("/spa", ["BAR", "KTV"])).toBe("/cashier");
  });

  it("does not take /cashier-something for the restaurant till", () => {
    expect(hiddenPosScreen("/cards", ["SPA"])).toBeNull();
  });
});
