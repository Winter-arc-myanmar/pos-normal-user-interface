import type { SalesOrderLine } from "@/core/domain/entities/Cashier";
import { givenAwayAmount } from "@/lib/pos/promotions";
import { printMoney } from "@/lib/printing/formatKdsTicket";

/**
 * What one line adds to the bill before the discount row: its price, without the
 * copies a promotion gave away. A lady's line reads the same way on the slip as
 * an item does, so the two rows still add up to the subtotal.
 */
const lineCharge = (line: SalesOrderLine) =>
  Number(line.quantity || 0) * Number(line.unitPrice || 0) - givenAwayAmount(line);

const toMoney = (value: number) => Math.round(value * 10000) / 10000;

/**
 * Whether a line is the lady's own charge: a hostess service such as "Hostess per
 * hour", the same line the board names her on. The food and drinks a lady orders
 * for the room are the party's, so they stay items of the bill.
 */
export function isLadyChargeLine(
  line: SalesOrderLine,
  serviceVariantIds?: Set<string>
): boolean {
  return Boolean(line.askWhoServed) || Boolean(serviceVariantIds?.has(line.variantId));
}

/** One lady's charges, as the slip names her under the bill's lady charge. */
export interface LadyChargeGroup {
  /** Who the bill names: her name, or what she was charged for when it names none. */
  name?: string;
  /** What her services charge in all. */
  amount: number;
  /** How many of the service she was charged for: 3 hours, say. */
  quantity: number;
  /** The one rate all her lines are charged at; left off when they differ. */
  unitPrice?: number;
}

export interface LadyChargeSplit {
  /** The party's items, without the ladies' own charges. */
  items: SalesOrderLine[];
  /** What the ladies charge in all, before tax and service charge. */
  ladyCharge: number;
  /** What each lady charges, so the slip keeps "3 hours of Snow" on the paper. */
  ladies: LadyChargeGroup[];
}

/**
 * Splits a KTV bill: the ladies' charges leave the item rows and print as one money
 * row below the service charge, with each lady and her hours under it, so the slip
 * reads with the venue's own wording instead of a charge under every item a lady
 * served.
 */
export function splitLadyCharges(
  lines: SalesOrderLine[],
  serviceVariantIds?: Set<string>,
  hostessName?: (id: string) => string | undefined
): LadyChargeSplit {
  const items: SalesOrderLine[] = [];
  const groups = new Map<string, LadyChargeGroup>();
  for (const line of lines) {
    if (!isLadyChargeLine(line, serviceVariantIds)) {
      items.push(line);
      continue;
    }
    const key = line.hostessId || "";
    const quantity = Number(line.quantity || 0);
    const unitPrice = Number(line.unitPrice || 0);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        name: (key ? hostessName?.(key) : undefined) || line.productName || undefined,
        amount: lineCharge(line),
        quantity,
        unitPrice,
      });
      continue;
    }
    group.amount += lineCharge(line);
    group.quantity += quantity;
    // Two rates for one lady read as her hours alone; the rates would not fit.
    if (group.unitPrice !== unitPrice) group.unitPrice = undefined;
  }
  const ladies = [...groups.values()].map((group) => ({
    ...group,
    amount: toMoney(group.amount),
  }));
  const ladyCharge = toMoney(ladies.reduce((sum, lady) => sum + lady.amount, 0));
  return { items, ladyCharge, ladies };
}

/** "Snow 3 × 20,000": who a lady charge is for, how many and at what rate. */
export function ladyChargeDetail(lady: LadyChargeGroup, unnamed: string) {
  const who = lady.name || unnamed;
  const count = printMoney(lady.quantity);
  return lady.unitPrice === undefined
    ? `${who} ×${count}`
    : `${who} ${count} × ${printMoney(lady.unitPrice)}`;
}
