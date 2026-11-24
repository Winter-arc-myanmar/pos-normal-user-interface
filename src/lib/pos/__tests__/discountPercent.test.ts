import { describe, expect, it } from "vitest";
import { discountAmountForPercent } from "../discountPercent";

describe("discountAmountForPercent", () => {
  it("takes the typed percentage off the bill's items", () => {
    expect(discountAmountForPercent("10", 1000)).toBe("100.0000");
    expect(discountAmountForPercent("15", 99.5)).toBe("14.9250");
  });

  it("reads a comma as the decimal point and ignores a typed % sign", () => {
    expect(discountAmountForPercent("12,5", 1000)).toBe("125.0000");
    expect(discountAmountForPercent("12.5%", 1000)).toBe("125.0000");
  });

  it("never takes off more than the bill holds", () => {
    expect(discountAmountForPercent("150", 1000)).toBe("1000.0000");
    expect(discountAmountForPercent("-5", 1000)).toBe("0.0000");
  });

  it("has nothing to take off an empty or unreadable bill", () => {
    expect(discountAmountForPercent("10", 0)).toBe("0.0000");
    expect(discountAmountForPercent("", 1000)).toBe("0.0000");
    expect(discountAmountForPercent("abc", 1000)).toBe("0.0000");
    expect(discountAmountForPercent("10", Number.NaN)).toBe("0.0000");
  });
});
