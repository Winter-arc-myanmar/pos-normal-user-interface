import { describe, expect, it } from "vitest";
import { SalesOrderLine } from "@/core/domain/entities/Cashier";
import { isLadyChargeLine, ladyChargeDetail, splitLadyCharges } from "../ladyCharge";

const line = (data: Partial<SalesOrderLine>) => new SalesOrderLine(data);

describe("lady charges on a KTV bill", () => {
  it("takes a hostess service the line names as a lady's charge", () => {
    expect(isLadyChargeLine(line({ askWhoServed: true }))).toBe(true);
    expect(isLadyChargeLine(line({ variantId: "variant-hostess" }), new Set(["variant-hostess"]))).toBe(
      true
    );
  });

  it("keeps a drink a lady ordered for the room an item of the bill", () => {
    expect(isLadyChargeLine(line({ variantId: "variant-beer", hostessId: "hostess-snow" }))).toBe(
      false
    );
  });

  it("adds the ladies' services into one charge and leaves the items as they were", () => {
    const items = splitLadyCharges(
      [
        line({ id: "line-1", variantId: "variant-beer", quantity: "2", unitPrice: "4000" }),
        line({ id: "line-2", askWhoServed: true, quantity: "1", unitPrice: "20000" }),
        line({ id: "line-3", askWhoServed: true, quantity: "2", unitPrice: "15000.5" }),
      ],
      undefined
    );

    expect(items.items.map((entry) => entry.id)).toEqual(["line-1"]);
    expect(items.ladyCharge).toBe(50001);
  });

  it("keeps each lady's hours and cost together, as the slip names them", () => {
    const { ladyCharge, ladies } = splitLadyCharges(
      [
        line({
          id: "line-1",
          askWhoServed: true,
          hostessId: "hostess-snow",
          quantity: "2",
          unitPrice: "20000",
        }),
        line({
          id: "line-2",
          askWhoServed: true,
          hostessId: "hostess-snow",
          quantity: "1",
          unitPrice: "20000",
        }),
        line({
          id: "line-3",
          askWhoServed: true,
          hostessId: "hostess-yuki",
          quantity: "2",
          unitPrice: "20000",
        }),
      ],
      undefined,
      (id) => (id === "hostess-snow" ? "Snow" : "Yuki")
    );

    expect(ladyCharge).toBe(100000);
    expect(ladies).toEqual([
      { name: "Snow", amount: 60000, quantity: 3, unitPrice: 20000 },
      { name: "Yuki", amount: 40000, quantity: 2, unitPrice: 20000 },
    ]);
    expect(ladies.map((lady) => ladyChargeDetail(lady, "a lady"))).toEqual([
      "Snow 3 × 20,000",
      "Yuki 2 × 20,000",
    ]);
  });

  it("says how many without a rate when a lady is charged at two of them", () => {
    const { ladies } = splitLadyCharges([
      line({ askWhoServed: true, hostessId: "hostess-snow", quantity: "1", unitPrice: "20000" }),
      line({ askWhoServed: true, hostessId: "hostess-snow", quantity: "1", unitPrice: "30000" }),
    ]);

    expect(ladies).toEqual([{ amount: 50000, quantity: 2, unitPrice: undefined }]);
    expect(ladyChargeDetail(ladies[0], "a lady")).toBe("a lady ×2");
  });

  it("reads a copy a promotion gave away at nothing, like the slip's subtotal", () => {
    const { ladyCharge } = splitLadyCharges([
      line({
        askWhoServed: true,
        quantity: "1",
        unitPrice: "20000",
        lineDiscount: "20000.0000",
        appliedPromotionId: "promo-1",
      }),
    ]);

    expect(ladyCharge).toBe(0);
  });

  it("says nothing is a lady charge when no line is one", () => {
    const { items, ladyCharge, ladies } = splitLadyCharges([
      line({ id: "line-1", variantId: "variant-beer", quantity: "1", unitPrice: "4000" }),
    ]);

    expect(items).toHaveLength(1);
    expect(ladies).toEqual([]);
    expect(ladyCharge).toBe(0);
  });
});
