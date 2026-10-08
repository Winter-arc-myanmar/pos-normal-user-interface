/** The staff member a receipt names as the cashier. */
export interface ReceiptCashier {
  id?: string;
  loginId?: string | null;
  name?: string;
}

/** The cashier the server sends with a payment or a bill, or null. */
export function parseCashier(value: unknown): ReceiptCashier | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!item.id && !item.name) return null;
  return {
    id: item.id ? String(item.id) : undefined,
    loginId: item.loginId ? String(item.loginId) : null,
    name: item.name ? String(item.name) : undefined,
  };
}

/** "Aung Aung (ID: SHW0001)": the first of these that has a name. */
export function cashierLabel(
  ...candidates: (ReceiptCashier | null | undefined)[]
): string | undefined {
  const who = candidates.find((item) => item?.name);
  if (!who?.name) return undefined;
  return who.loginId ? `${who.name} (ID: ${who.loginId})` : who.name;
}
