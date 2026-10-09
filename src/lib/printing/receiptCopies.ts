import type { PrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";
import type { SaleReceipt } from "./formatKdsTicket";

export type BillCopy = "CUSTOMER" | "ORDER_RECEIPT" | "FINANCE";

/** The guest's copy first: they are the one waiting. */
const ORDER: BillCopy[] = ["CUSTOMER", "ORDER_RECEIPT", "FINANCE"];

/** The copies a paid bill prints at checkout; the guest's alone when none are chosen. */
export function checkoutCopies(template?: PrintTemplateSettings): BillCopy[] {
  const chosen = ORDER.filter((copy) => template?.copies.includes(copy));
  return chosen.length ? chosen : ["CUSTOMER"];
}

/** One copy of a paid bill, titled with its name. */
export function copySlip(receipt: SaleReceipt, copy: BillCopy): SaleReceipt {
  if (copy === "ORDER_RECEIPT") return { ...receipt, copy, title: "Order receipt" };
  if (copy === "FINANCE") {
    return {
      ...receipt,
      copy,
      title: "Finance copy",
      place: "FINANCE",
      showLogo: false,
      template: undefined,
      paperWidth: undefined,
      company: undefined,
      logo: undefined,
    };
  }
  return { ...receipt, copy };
}
