import { SaleReceipt } from "./formatKdsTicket";

interface CardReceipt {
  receiptId: string;
  cardNumber: string;
  customerName?: string;
  amount: string;
  balanceAfter: string;
  printedAt: string;
}

/** A guest card top-up or refund as its slip prints it. */
export function cardSlip(
  title: string,
  amountLabel: string,
  receipt: CardReceipt,
  paidWith?: string
): SaleReceipt {
  return {
    title,
    receiptId: receipt.receiptId,
    paidAt: receipt.printedAt,
    facts: [
      { label: "Card no", value: receipt.cardNumber },
      ...(receipt.customerName ? [{ label: "Guest", value: receipt.customerName }] : []),
    ],
    lines: [],
    totalLabel: amountLabel.toUpperCase(),
    total: receipt.amount,
    payments: paidWith ? [{ name: paidWith, amount: receipt.amount }] : [],
    balanceAfter: receipt.balanceAfter,
  };
}
