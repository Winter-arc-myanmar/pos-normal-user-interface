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
