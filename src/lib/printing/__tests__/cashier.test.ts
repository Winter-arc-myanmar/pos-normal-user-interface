import { describe, expect, it } from "vitest";
import { cashierLabel, parseCashier } from "../cashier";
import { defaultPrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";
import { formatSaleReceipt } from "../formatKdsTicket";

describe("the cashier on a receipt", () => {
  it("reads the cashier the server sends", () => {
    expect(
      parseCashier({ id: "user-1", loginId: "SHW0001", name: "Aung Aung" })
    ).toEqual({ id: "user-1", loginId: "SHW0001", name: "Aung Aung" });
    expect(parseCashier(null)).toBeNull();
    expect(parseCashier({})).toBeNull();
  });

  it("shows the name with the user ID", () => {
    expect(cashierLabel({ name: "Aung Aung", loginId: "SHW0001" })).toBe(
      "Aung Aung (ID: SHW0001)"
    );
    expect(cashierLabel({ name: "Aung Aung" })).toBe("Aung Aung");
  });

  it("uses who took the payment before who is signed in", () => {
    expect(
      cashierLabel(
        { name: "Aung Aung", loginId: "SHW0001" },
        { name: "Su Su", loginId: "SHW0002" }
      )
    ).toBe("Aung Aung (ID: SHW0001)");
    expect(cashierLabel(null, { name: "Su Su", loginId: "SHW0002" })).toBe(
      "Su Su (ID: SHW0002)"
    );
    expect(cashierLabel(null, undefined)).toBeUndefined();
  });

  it("prints a Cashier line", () => {
    const printed = formatSaleReceipt({
      title: "RECEIPT",
      cashier: "Aung Aung (ID: SHW0001)",
      lines: [],
      total: "1000",
      template: defaultPrintTemplateSettings(),
    });
    expect(printed).toMatch(/Cashier\s+Aung Aung \(ID: SHW0001\)/);
  });
});
