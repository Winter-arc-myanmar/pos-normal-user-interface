/**
 * The discount, its reason and the tip a cashier sets on one bill. They belong
 * to that order alone: switching to another table must never carry them over,
 * and coming back to the table after another screen must find them again.
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

type BillAdjustmentMap = Record<string, BillAdjustments>;

const readMap = (): BillAdjustmentMap => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BillAdjustmentMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeMap = (map: BillAdjustmentMap) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage can be blocked; the bill then keeps its choices on screen only.
  }
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
    map[orderId] = value;
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
