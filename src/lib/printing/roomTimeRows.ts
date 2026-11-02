import type { SalesOrderLine } from "@/core/domain/entities/Cashier";
import type { PrintLine } from "./formatKdsTicket";

/** A bill row as the slip prints it: its oldest line, and how many of it. */
export interface SlipRow {
  line: SalesOrderLine;
  quantity: number;
}

/** One row on the slip, or the room's time gathered into one. */
export interface SlipRowGroup {
  rows: SlipRow[];
}

/**
 * Gathers a room's time into one row wherever it sits on the bill: a room sold
 * as 2 hours at one rate and 30 minutes at another prints as one line, so the
 * guest reads the time they had rather than the rates it was sold at. Every
 * other row stays a row of its own. Only the paper is gathered this way; the
 * till keeps a line for each rate.
 */
export function groupRoomTimeRows(
  rows: SlipRow[],
  isRoomRate: (line: SalesOrderLine) => boolean
): SlipRowGroup[] {
  const groups: SlipRowGroup[] = [];
  let room: SlipRowGroup | null = null;
  for (const row of rows) {
    if (!isRoomRate(row.line)) {
      groups.push({ rows: [row] });
      continue;
    }
    if (!room) {
      room = { rows: [] };
      groups.push(room);
    }
    room.rows.push(row);
  }
  return groups;
}

/**
 * The one row a room's time prints as when it was sold at more than one rate:
 * "3 x KTV Room 101 (9:33 - 12:03)  110,000", with a price for each rate under
 * it, "2 @ 50,000" and "1 @ 10,000".
 */
export function mergedRoomTimeLine(group: SlipRowGroup, name: string): PrintLine {
  const quantity = group.rows.reduce((sum, row) => sum + row.quantity, 0);
  const amount = group.rows.reduce(
    (sum, row) => sum + row.quantity * Number(row.line.unitPrice || 0),
    0
  );
  return {
    name,
    quantity: String(quantity),
    amount: amount.toFixed(4),
    priceRows: group.rows.map((row) => ({
      quantity: String(row.quantity),
      unitPrice: Number(row.line.unitPrice || 0).toFixed(4),
    })),
  };
}
