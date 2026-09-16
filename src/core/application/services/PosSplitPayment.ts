import { CheckoutPaymentEntryDTO } from "../dtos/CashierDTO";

export interface SplitTenderInput {
  id: string;
  paymentMethodId: string;
  amount: string;
  guestCardId?: string;
}

const toAmount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatPaymentAmount = (value: number): string =>
  Math.max(0, value).toFixed(4);

export const sumTenderAmounts = (tenders: Array<{ amount: string | number }>): number =>
  tenders.reduce((sum, tender) => sum + Math.max(0, toAmount(tender.amount)), 0);

export const remainingReceivable = (
  total: string | number,
  tenders: Array<{ amount: string | number }>
): number => Math.max(0, toAmount(total) - sumTenderAmounts(tenders));

const withOptionalGuestCard = (
  payment: CheckoutPaymentEntryDTO,
  guestCardId?: string
): CheckoutPaymentEntryDTO => {
  const cardId = guestCardId?.trim();
  if (!cardId) return payment;
  return { ...payment, guestCardId: cardId };
};

export const buildCheckoutPayments = (args: {
  total: string | number;
  paymentMethodId?: string;
  paymentAmount?: string;
  guestCardId?: string;
  splitTenders?: SplitTenderInput[];
  isSplitMode?: boolean;
}): CheckoutPaymentEntryDTO[] => {
  if (args.isSplitMode && (args.splitTenders?.length || 0) > 0) {
    return (args.splitTenders || [])
      .filter((tender) => tender.paymentMethodId && toAmount(tender.amount) > 0)
      .map((tender) =>
        withOptionalGuestCard(
          {
            paymentMethodId: tender.paymentMethodId,
            amount: formatPaymentAmount(toAmount(tender.amount)),
          },
          tender.guestCardId
        )
      );
  }

  if (!args.paymentMethodId) return [];
  return [
    withOptionalGuestCard(
      {
        paymentMethodId: args.paymentMethodId,
        amount: formatPaymentAmount(toAmount(args.paymentAmount ?? args.total)),
      },
      args.guestCardId
    ),
  ];
};

export const attachGuestCardIdToMemberPayments = (
  payments: CheckoutPaymentEntryDTO[],
  guestCardId: string | undefined,
  isMemberCardMethod: (paymentMethodId: string) => boolean
): CheckoutPaymentEntryDTO[] =>
  payments.map((payment) => {
    if (!isMemberCardMethod(payment.paymentMethodId)) {
      return {
        paymentMethodId: payment.paymentMethodId,
        amount: payment.amount,
        ...(payment.tipAmount ? { tipAmount: payment.tipAmount } : {}),
        ...(payment.transactionReference
          ? { transactionReference: payment.transactionReference }
          : {}),
      };
    }
    return withOptionalGuestCard(payment, payment.guestCardId || guestCardId);
  });

export const assertCheckoutPaymentsReady = (args: {
  total: string | number;
  payments: CheckoutPaymentEntryDTO[];
}): void => {
  if (!args.payments.length) {
    throw new Error("Choose a payment method first.");
  }
  if (args.payments.some((payment) => !payment.paymentMethodId)) {
    throw new Error("Choose a payment method first.");
  }
  const paid = sumTenderAmounts(args.payments);
  const total = toAmount(args.total);
  if (paid <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }
  if (Math.abs(paid - total) > 0.009) {
    throw new Error("Split payments must equal the remaining receivable.");
  }
};
