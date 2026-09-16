import { PaymentMethod } from "@/core/domain/entities/Cashier";

const MOBILE_WALLET_TOKENS = [
  "kbz",
  "wave",
  "mpu",
  "aya pay",
  "cb pay",
  "mobile",
  "transfer",
  "wallet",
];

const normalize = (value?: string): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

export function paymentRequiresReference(method?: PaymentMethod | null): boolean {
  if (!method) return false;
  const haystack = `${normalize(method.name)} ${normalize(method.code)} ${normalize(method.type)} ${normalize(method.kind)}`;
  if (
    haystack.includes("member card") ||
    haystack.includes("membership") ||
    haystack.includes("guest card")
  ) {
    return false;
  }
  return MOBILE_WALLET_TOKENS.some((token) => haystack.includes(token));
}

export function assertPaymentReference(
  method: PaymentMethod | undefined,
  reference: string | undefined
): void {
  if (!paymentRequiresReference(method)) return;
  if (!reference?.trim()) {
    throw new Error("A payment reference is required for this method");
  }
}
