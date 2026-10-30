import { SalesOrderLine } from "@/core/domain/entities/Cashier";

export interface BillLineGroup {
  key: string;
  /** The bill's own lines, oldest first; each room order keeps its own. */
  lines: SalesOrderLine[];
  quantity: number;
  total: number;
}

const lineTotal = (line: SalesOrderLine) =>
  Number(line.quantity || 0) * Number(line.unitPrice || 0) - Number(line.lineDiscount || 0);

/**
 * Every order sent from a room is saved as lines of its own, so a second round of
 * the same drink is a second line. On the bill they read as one row; only lines
 * sold alike (price, hostess, free, promotion, options) are put together.
 */
export function groupBillLines(lines: SalesOrderLine[]): BillLineGroup[] {
  const groups = new Map<string, BillLineGroup>();
  for (const line of lines) {
    const key = [
      line.variantId,
      Number(line.unitPrice || 0),
      line.hostessId ?? "",
      line.compReasonId ? "foc" : "",
      line.appliedPromotionId ?? "",
      line.productName ?? "",
      JSON.stringify(line.selectedModifiers ?? []),
    ].join("|");
    const group = groups.get(key);
    if (group) {
      group.lines.push(line);
      group.quantity += Number(line.quantity || 0);
      group.total += lineTotal(line);
    } else {
      groups.set(key, {
        key,
        lines: [line],
        quantity: Number(line.quantity || 0),
        total: lineTotal(line),
      });
    }
  }
  return [...groups.values()];
}
