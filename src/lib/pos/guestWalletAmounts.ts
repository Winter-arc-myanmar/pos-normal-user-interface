export interface GuestWalletAmountOption {
  id: string;
  label: string;
  amount: string;
}

export const GUEST_WALLET_AMOUNT_OPTIONS: GuestWalletAmountOption[] = [
  { id: "10k", label: "10,000", amount: "10000.0000" },
  { id: "20k", label: "20,000", amount: "20000.0000" },
  { id: "50k", label: "50,000", amount: "50000.0000" },
  { id: "100k", label: "100,000", amount: "100000.0000" },
];

export function isUnspendableWalletStatus(status?: string): boolean {
  const value = String(status || "").toUpperCase();
  return (
    value === "CLOSED" ||
    value === "SETTLED" ||
    value === "VOIDED" ||
    value === "SETTLING"
  );
}
