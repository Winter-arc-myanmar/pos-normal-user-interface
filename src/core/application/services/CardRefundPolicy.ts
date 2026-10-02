import { MembershipCardRefundAmountOptionDTO } from "../dtos/MembershipCardDTO";

export const DEFAULT_REFUND_AMOUNT_OPTIONS: MembershipCardRefundAmountOptionDTO[] =
  [
    { id: "refund-5", label: "5,000", amount: "5000.0000" },
    { id: "refund-10", label: "10,000", amount: "10000.0000" },
    { id: "refund-20", label: "20,000", amount: "20000.0000" },
    { id: "refund-50", label: "50,000", amount: "50000.0000" },
  ];

const toAmount = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number => Math.round(value * 10000) / 10000;

export class CardRefundPolicy {
  static defaultAmountOptions(): MembershipCardRefundAmountOptionDTO[] {
    return DEFAULT_REFUND_AMOUNT_OPTIONS.map((option) => ({ ...option }));
  }

  static refundableAmount(wallet: {
    balance?: string;
    purchasedBalance?: string;
  }): number {
    const balance = Math.max(0, roundMoney(toAmount(wallet.balance)));
    const purchased = Math.max(0, roundMoney(toAmount(wallet.purchasedBalance)));
    if (purchased > 0) {
      return Math.min(balance, purchased);
    }
    return balance;
  }

  static assertRefundAmount(
    amount: string,
    wallet: { balance?: string; purchasedBalance?: string }
  ): void {
    const parsed = roundMoney(toAmount(amount));
    if (parsed <= 0) {
      throw new Error("Refund amount must be greater than zero");
    }
    const refundable = this.refundableAmount(wallet);
    if (parsed > refundable) {
      throw new Error("Refund amount cannot exceed card balance");
    }
  }
}
