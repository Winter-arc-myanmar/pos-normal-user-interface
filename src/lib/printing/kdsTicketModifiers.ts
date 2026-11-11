import {
  KdsTicket,
  KdsTicketLine,
  SalesOrderLine,
} from "@/core/domain/entities/Cashier";
import { withVariant } from "@/lib/pos/orderListDisplay";
import { modifierPrintText } from "./modifierText";

/**
 * Names the KTV lady who ordered each ticket line, as this till knows her. The
 * ticket the server sends need not carry her, and the kitchen slip prints her
 * after the line's options, so the order line (her id) fills her in.
 */
export function applyKdsTicketHostess(
  ticket: KdsTicket,
  orderLines: SalesOrderLine[],
  hostessName: (id: string) => string | undefined
): KdsTicket {
  if (!ticket.kdsTicketLines?.length) return ticket;

  const linesById = new Map(orderLines.map((line) => [line.id, line]));
  let changed = false;
  const ticketLines = ticket.kdsTicketLines.map((line) => {
    if (line.orderedBy?.trim()) return line;
    const orderLine = linesById.get(line.salesOrderLineId);
    const name = orderLine?.hostessId ? hostessName(orderLine.hostessId) : undefined;
    if (!name) return line;
    changed = true;
    return new KdsTicketLine({ ...line, orderedBy: name });
  });

  if (!changed) return ticket;

  return new KdsTicket({
    ...ticket,
    kdsTicketLines: ticketLines,
    lines: ticket.lines?.length
      ? ticket.lines.map((line, index) => ({
          ...line,
          orderedBy: ticketLines[index]?.orderedBy || line.orderedBy,
        }))
      : ticket.lines,
  });
}

/** The product name an order line was printed under, for matching a ticket. */
const orderLineNameKey = (line: {
  productName?: string;
  variantName?: string;
}) => (line.productName || line.variantName || "").trim().toLowerCase();

/** The names a ticket line may print for this order line: plain, and with its variant. */
const orderLineNameKeys = (line: SalesOrderLine) => {
  const keys = new Set<string>();
  const base = orderLineNameKey(line);
  if (base) keys.add(base);
  if (line.productName) {
    const withItsVariant = withVariant(line.productName, line.variantName)
      .trim()
      .toLowerCase();
    if (withItsVariant) keys.add(withItsVariant);
  }
  return [...keys];
};

/**
 * Server KDS tickets can arrive with an empty `kitchenModifiers` even though
 * the order line has modifiers. Fill those lines from the sales order before
 * the ticket is printed; tickets that already carry modifiers are left alone.
 *
 * A ticket line is matched to its order line by id. A ticket that does not
 * carry the id - some servers send only the printed name - is matched by the
 * product name it printed, when that name is not ambiguous.
 */
export function applyKdsTicketModifiers(
  ticket: KdsTicket,
  orderLines: SalesOrderLine[]
): KdsTicket {
  const hasTicketLines = Boolean(ticket.kdsTicketLines?.length);
  const hasPrintLines = Boolean(ticket.lines?.length);
  if (!hasTicketLines && !hasPrintLines) return ticket;

  const linesById = new Map(orderLines.map((line) => [line.id, line]));
  const linesByName = new Map<string, SalesOrderLine[]>();
  for (const line of orderLines) {
    for (const key of orderLineNameKeys(line)) {
      const current = linesByName.get(key) || [];
      if (!current.includes(line)) current.push(line);
      linesByName.set(key, current);
    }
  }

  const orderLineFor = (
    id?: string,
    productName?: string,
    quantity?: string | number
  ) => {
    const byId = id ? linesById.get(id) : undefined;
    if (byId) return byId;
    const named = linesByName.get(orderLineNameKey({ productName })) || [];
    if (named.length === 1) return named[0];
    const wanted = Number(quantity || 1);
    const sameQuantity = named.filter(
      (line) => Math.abs(Number(line.quantity || 1) - wanted) < 0.0001
    );
    return sameQuantity.length === 1 ? sameQuantity[0] : undefined;
  };

  const ticketLineOrderLine = (line: KdsTicketLine) =>
    orderLineFor(line.salesOrderLineId, line.productName, line.quantity);

  let changed = false;
  const filled = new Set<number>();
  const ticketLines = (ticket.kdsTicketLines || []).map((line, index) => {
    if (line.kitchenModifiers?.trim()) return line;
    const orderLine = ticketLineOrderLine(line);
    const modifiers = orderLine
      ? modifierPrintText(orderLine.selectedModifiers)
      : {};
    if (!modifiers.names) return line;
    changed = true;
    filled.add(index);
    return new KdsTicketLine({
      ...line,
      kitchenModifiers: modifiers.names,
      modifierPrices: modifiers.prices,
    });
  });

  const lines = ticket.lines?.map((line, index) => {
    if (line.modifiers?.trim()) return line;
    // A ticket with its own lines prints the order line that filled the
    // matching ticket line; a ticket built from plain lines is matched by name.
    const orderLine = hasTicketLines
      ? filled.has(index)
        ? ticketLineOrderLine(ticket.kdsTicketLines![index])
        : undefined
      : orderLineFor(undefined, line.name, line.quantity);
    const modifiers = orderLine
      ? modifierPrintText(orderLine.selectedModifiers)
      : {};
    if (!modifiers.names) return line;
    changed = true;
    return {
      ...line,
      modifiers: modifiers.names,
      modifierPrices: modifiers.prices,
    };
  });

  if (!changed) return ticket;

  return new KdsTicket({
    ...ticket,
    ...(hasTicketLines ? { kdsTicketLines: ticketLines } : {}),
    ...(ticket.lines ? { lines } : {}),
  });
}
