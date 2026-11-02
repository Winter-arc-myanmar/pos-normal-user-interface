import { describe, expect, it } from "vitest";
import { SalesOrderLine } from "@/core/domain/entities/Cashier";
import { buildSaleReceiptLines } from "../formatKdsTicket";
import {
  groupRoomTimeRows,
  mergedRoomTimeLine,
  type SlipRow,
} from "../roomTimeRows";

const line = (over: Partial<SalesOrderLine> & { id: string }) =>
  new SalesOrderLine({
    salesOrderId: "order-1",
    variantId: "variant-hour",
    productName: "KTV Room R-01",
    categoryName: "KTV Rooms",
    quantity: "1.0000",
    unitPrice: "50000.0000",
    ...over,
  });

const rows: SlipRow[] = [
  { line: line({ id: "line-hour", quantity: "2.0000" }), quantity: 2 },
  { line: line({ id: "line-beer", variantId: "variant-beer", productName: "Beer", categoryName: "Beer", unitPrice: "4000.0000" }), quantity: 1 },
  { line: line({ id: "line-half", quantity: "1.0000", unitPrice: "10000.0000" }), quantity: 1 },
];

const isRoomRate = (candidate: SalesOrderLine) => candidate.categoryName === "KTV Rooms";

describe("roomTimeRows", () => {
  it("gathers a room's rates into one row where it first appears", () => {
    const groups = groupRoomTimeRows(rows, isRoomRate);

    expect(groups).toHaveLength(2);
    expect(groups[0].rows.map((row) => row.line.id)).toEqual(["line-hour", "line-half"]);
    expect(groups[1].rows.map((row) => row.line.id)).toEqual(["line-beer"]);
  });

  it("leaves a room sold at one rate as its own row", () => {
    const groups = groupRoomTimeRows([rows[0], rows[1]], isRoomRate);

    expect(groups.map((group) => group.rows.length)).toEqual([1, 1]);
  });

  it("prints three blocks of room time as one row, priced per rate", () => {
    const [room] = groupRoomTimeRows(rows, isRoomRate);

    expect(mergedRoomTimeLine(room, "KTV Room R-01 (9:33 - 12:03)")).toEqual({
      name: "KTV Room R-01 (9:33 - 12:03)",
      quantity: "3",
      amount: "110000.0000",
      priceRows: [
        { quantity: "2", unitPrice: "50000.0000" },
        { quantity: "1", unitPrice: "10000.0000" },
      ],
    });
  });

  it("reads on the slip as one line with a price for each rate", () => {
    const [room] = groupRoomTimeRows(rows, isRoomRate);
    const slip = buildSaleReceiptLines({
      title: "RECEIPT",
      lines: [mergedRoomTimeLine(room, "KTV Room R-01 (9:33 - 12:03)")],
      total: "110000.0000",
      paperWidth: "MM80",
    }).join("\n");

    expect(slip).toMatch(/3 x KTV Room R-01 \(9:33 - 12:03\)\s+110,000/);
    expect(slip).toMatch(/\n\s+2 @ 50,000/);
    expect(slip).toMatch(/\n\s+1 @ 10,000/);
  });
});
