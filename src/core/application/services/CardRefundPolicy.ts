import { MembershipCardRefundAmountOptionDTO } from "../dtos/MembershipCardDTO";

export const DEFAULT_REFUND_AMOUNT_OPTIONS: MembershipCardRefundAmountOptionDTO[] =
  [
    { id: "refund-5", label: "5,000", amount: "5000.0000" },
    { id: "refund-10", label: "10,000", amount: "10000.0000" },
    { id: "refund-20", label: "20,000", amount: "20000.0000" },
    { id: "refund-50", label: "50,000", amount: "50000.0000" },
  ];

export class CardRefundPolicy {
  static defaultAmountOptions(): MembershipCardRefundAmountOptionDTO[] {
    return DEFAULT_REFUND_AMOUNT_OPTIONS.map((option) => ({ ...option }));
  }
}
