import {
  KdsTicket,
  KdsTicketLine,
  SalesOrderLine,
} from "@/core/domain/entities/Cashier";
import { modifierPrintText } from "./modifierText";

/**
 * Server KDS tickets can arrive with an empty `kitchenModifiers` even though
 * the order line has modifiers. Fill those lines from the sales order before
 * the ticket is printed; tickets that already carry modifiers are left alone.
 */
export function applyKdsTicketModifiers(
  ticket: KdsTicket,
  orderLines: SalesOrderLine[]
): KdsTicket {
  if (!ticket.kdsTicketLines?.length) return ticket;

  const linesById = new Map(orderLines.map((line) => [line.id, line]));
  let changed = false;
  const ticketLines = ticket.kdsTicketLines.map((line) => {
    if (line.kitchenModifiers?.trim()) return line;
    const orderLine = linesById.get(line.salesOrderLineId);
    if (!orderLine) return line;
    const modifiers = modifierPrintText(orderLine.selectedModifiers);
    if (!modifiers.names) return line;
    changed = true;
    return new KdsTicketLine({
      ...line,
      kitchenModifiers: modifiers.names,
      modifierPrices: modifiers.prices,
    });
  });

  if (!changed) return ticket;

  return new KdsTicket({
    ...ticket,
    kdsTicketLines: ticketLines,
    lines: ticket.lines?.length
      ? ticket.lines.map((line, index) => ({
          ...line,
          modifiers: ticketLines[index]?.kitchenModifiers || line.modifiers,
          modifierPrices: ticketLines[index]?.modifierPrices || line.modifierPrices,
        }))
      : ticket.lines,
  });
}
