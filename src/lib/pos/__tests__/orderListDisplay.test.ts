import { describe, expect, it } from "vitest";
import {
  formatPosQuantity,
  lineDisplayName,
  salesOrderServiceTypeKey,
  salesOrderStatusKey,
} from "../orderListDisplay";

describe("orderListDisplay", () => {
  it("formats quantities without trailing four-decimal zeros", () => {
    expect(formatPosQuantity("1.0000")).toBe("1");
    expect(formatPosQuantity("1.5000")).toBe("1.5");
  });

  it("maps service and status codes to POS labels", () => {
    expect(salesOrderServiceTypeKey("PICK_UP")).toBe("cashier.serviceTypes.pickUp");
    expect(salesOrderStatusKey("DRAFT")).toBe("salesOrders.status.open");
    expect(salesOrderStatusKey("VOIDED")).toBe("salesOrders.status.voided");
  });

  it("prefers product names over raw SKUs", () => {
    expect(
      lineDisplayName({
        productName: "Coffee",
        sku: "COFFEE-LARGE",
      })
    ).toBe("Coffee");
    expect(lineDisplayName({ sku: "COFFEE-LARGE" })).toBe("COFFEE-LARGE");
    expect(
      lineDisplayName({
        productName: "3f2a0d1c-7b4e-4c2a-9f11-aaaaaaaaaaaa",
      })
    ).toBe("");
  });
});
