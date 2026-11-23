/**
 * The discount, its reason and the tip a cashier sets on one bill. They belong
 * to that order alone: switching to another table must never carry them over,
 * and coming back to the table — another screen, or after the till was closed —
 * must find them again.
 */
export interface BillAdjustments {
  discount: string;
  discountReasonId: string;
  tip: string;
}

export const EMPTY_BILL_ADJUSTMENTS: BillAdjustments = {
  discount: "0.0000",
  discountReasonId: "",
  tip: "0.0000",
};

const STORAGE_KEY = "pos-bill-adjustments";
/** A typed bill survives a shift on the till, not a week of forgotten tables. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

type StoredAdjustments = BillAdjustments & { savedAt: number };
type BillAdjustmentMap = Record<string, StoredAdjustments>;

/**
 * localStorage is not always usable: the Android printer shell's WebView can
 * deny it, and the denial surfaces as a thrown error rather than a missing API.
 * Mirroring the value in memory keeps a typed discount working for this session
 * instead of silently losing it.
 */
let memoryMirror: string | null = null;

const readRaw = (): string | null => {
  try {
    if (typeof localStorage !== "undefined") {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value !== null) return value;
      if (memoryMirror === null) return null;
    }
  } catch {
    // Storage is blocked; fall through to the in-memory mirror.
  }
  return memoryMirror;
};

const writeRaw = (value: string) => {
  try {
    if (typeof localStorage === "undefined") throw new Error("storage unavailable");
    localStorage.setItem(STORAGE_KEY, value);
    memoryMirror = null;
    return;
  } catch {
    // Blocked storage: the in-memory mirror below keeps this session working.
  }
  memoryMirror = value;
};

const readMap = (): BillAdjustmentMap => {
  try {
    const raw = readRaw();
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BillAdjustmentMap;
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    const live: BillAdjustmentMap = {};
    for (const [orderId, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== "object") continue;
      // A bill left open for days starts clean rather than discounting itself.
      if (now - Number(entry.savedAt || 0) > MAX_AGE_MS) continue;
      live[orderId] = entry;
    }
    return live;
  } catch {
    return {};
  }
};

const writeMap = (map: BillAdjustmentMap) => {
  writeRaw(JSON.stringify(map));
};

/** Nothing worth keeping: the bill is back to its plain price. */
const isEmpty = (value: BillAdjustments) =>
  Number(value.discount) <= 0 && Number(value.tip) <= 0 && !value.discountReasonId;

export const readBillAdjustments = (orderId?: string | null): BillAdjustments => {
  if (!orderId) return EMPTY_BILL_ADJUSTMENTS;
  const stored = readMap()[orderId];
  if (!stored || typeof stored !== "object") return EMPTY_BILL_ADJUSTMENTS;
  return {
    discount: String(stored.discount ?? EMPTY_BILL_ADJUSTMENTS.discount),
    discountReasonId: String(stored.discountReasonId ?? ""),
    tip: String(stored.tip ?? EMPTY_BILL_ADJUSTMENTS.tip),
  };
};

export const writeBillAdjustments = (
  orderId: string | null | undefined,
  value: BillAdjustments
) => {
  // A quick sale has no order yet, so there is nothing to hang its bill on.
  if (!orderId) return;
  const map = readMap();
  if (isEmpty(value)) {
    if (!(orderId in map)) return;
    delete map[orderId];
  } else {
    map[orderId] = { ...value, savedAt: Date.now() };
  }
  writeMap(map);
};

/** The order is settled or voided: its discount must not wait for another bill. */
export const clearBillAdjustments = (orderId?: string | null) => {
  if (!orderId) return;
  const map = readMap();
  if (!(orderId in map)) return;
  delete map[orderId];
  writeMap(map);
};
