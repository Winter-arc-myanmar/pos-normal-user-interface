import { MembershipCardTopupAmountOptionDTO } from "../dtos/MembershipCardDTO";

export const DEFAULT_TOPUP_AMOUNT_OPTIONS: MembershipCardTopupAmountOptionDTO[] =
  [
    { id: "topup-10", label: "10,000", amount: "10000.0000" },
    { id: "topup-20", label: "20,000", amount: "20000.0000" },
    { id: "topup-50", label: "50,000", amount: "50000.0000" },
    { id: "topup-100", label: "100,000", amount: "100000.0000" },
  ];

export class CardTopupPolicy {
  static defaultAmountOptions(): MembershipCardTopupAmountOptionDTO[] {
    return DEFAULT_TOPUP_AMOUNT_OPTIONS.map((option) => ({ ...option }));
  }
}
