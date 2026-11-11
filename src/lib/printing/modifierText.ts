export interface ModifierPrintText {
  names?: string;
  prices?: string;
}

const amountText = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim();
  if (!text || Number(text) === 0) return undefined;
  return text;
};

const namedModifier = (record: Record<string, unknown>) => {
  const nested = record.modifier ?? record.option;
  const nestedName =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>).name
      : undefined;
  const name = record.name ?? record.modifierName ?? record.label ?? nestedName;
  if (typeof name !== "string" || !name.trim()) return undefined;
  return {
    name: name.trim(),
    price: amountText(record.priceDelta ?? record.price ?? record.amount),
  };
};

const collectModifiers = (
  value: unknown
): Array<{ name: string; price?: string }> => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return collectModifiers(JSON.parse(trimmed) as unknown);
      } catch {
        return [{ name: trimmed }];
      }
    }
    return [{ name: trimmed }];
  }
  if (Array.isArray(value)) return value.flatMap(collectModifiers);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const direct = namedModifier(record);
  if (direct) return [direct];
  return Object.values(record).flatMap(collectModifiers);
};

export const modifierPrintText = (value: unknown): ModifierPrintText => {
  const modifiers = collectModifiers(value);
  if (!modifiers.length) return {};
  return {
    names: modifiers.map((modifier) => modifier.name).join(", "),
    prices: modifiers.map((modifier) => modifier.price || "-").join(", "),
  };
};

/** The prices that name money, or none when every option is free. */
const pricedText = (prices?: string) =>
  prices?.split(", ").some((price) => price && price !== "-") ? prices : undefined;

/**
 * The first of `values` that names options, as they print. A slip line may get
 * its options from the ticket, the sold line, or a field the API nested them
 * in; the first field that carries names is the one the guest chose.
 */
export const firstModifierPrintText = (values: unknown[]): ModifierPrintText => {
  for (const value of values) {
    const printed = modifierPrintText(value);
    if (printed.names) {
      const prices = pricedText(printed.prices);
      return { names: printed.names, ...(prices ? { prices } : {}) };
    }
  }
  return {};
};
