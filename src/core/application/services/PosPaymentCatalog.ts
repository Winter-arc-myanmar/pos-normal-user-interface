import { CheckoutPaymentEntryDTO } from "../dtos/CashierDTO";
import { PaymentMethod } from "../../domain/entities/Cashier";

export const LOCAL_MEMBER_CARD_METHOD_ID = "local-member-card";
export const MEMBER_CARD_METHOD_CODE = "MEMBER_CARD";

const MEMBER_CARD_TOKENS = [
  "member card",
  "membership card",
  "membercard",
  "membership",
  "guest card",
  "guest wallet",
  "guestcard",
];

const normalize = (value?: string): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

export const isMemberCardPaymentMethod = (method?: PaymentMethod | null): boolean => {
  if (!method) return false;
  if (method.id === LOCAL_MEMBER_CARD_METHOD_ID) return true;
  const kind = normalize(method.kind);
  const code = normalize(method.code);
  const type = normalize(method.type);
  if (
    kind === "member card" ||
    kind === "guest card" ||
    kind === "membership card" ||
    code === "member card" ||
    code === "guest card" ||
    type === "member card" ||
    type === "guest card"
  ) {
    return true;
  }
  const name = normalize(method.name);
  return MEMBER_CARD_TOKENS.some((token) => name.includes(token));
};

export const createLocalMemberCardMethod = (): PaymentMethod =>
  new PaymentMethod({
    id: LOCAL_MEMBER_CARD_METHOD_ID,
    tenantId: "",
    name: "Member Card",
    kind: MEMBER_CARD_METHOD_CODE,
    code: MEMBER_CARD_METHOD_CODE,
    type: MEMBER_CARD_METHOD_CODE,
  });

export const ensureMemberCardPaymentMethod = (
  methods: PaymentMethod[]
): PaymentMethod[] => methods;

export const findMemberCardPaymentMethod = (
  methods: PaymentMethod[]
): PaymentMethod | undefined =>
  ensureMemberCardPaymentMethod(methods).find((method) =>
    isMemberCardPaymentMethod(method)
  );

export class PosPaymentCatalog {
  static withMemberCard(methods: PaymentMethod[]): PaymentMethod[] {
    return ensureMemberCardPaymentMethod(methods);
  }

  static assertNoLocalFallbackPayments(
    payments: CheckoutPaymentEntryDTO[],
    methods: PaymentMethod[]
  ): void {
    const methodById = new Map(methods.map((method) => [method.id, method]));
    const usesLocalFallback = payments.some((payment) => {
      const method = methodById.get(payment.paymentMethodId);
      return (
        method?.isLocalFallback ||
        payment.paymentMethodId === LOCAL_MEMBER_CARD_METHOD_ID
      );
    });

    if (usesLocalFallback) {
      throw new Error(
        "Member card payment is not configured on this branch yet."
      );
    }
  }

  static assertGuestCardPayments(
    payments: CheckoutPaymentEntryDTO[],
    methods: PaymentMethod[]
  ): void {
    const methodById = new Map(methods.map((method) => [method.id, method]));
    const missingGuestCard = payments.some((payment) => {
      const method = methodById.get(payment.paymentMethodId);
      return isMemberCardPaymentMethod(method) && !payment.guestCardId?.trim();
    });

    if (missingGuestCard) {
      throw new Error(
        "Look up a guest card before taking Member Card payment."
      );
    }
  }
}
