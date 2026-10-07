export type PosKind = "BAR" | "KTV" | "SPA";
export type ShiftRule = "PER_LOGIN" | "DAILY";

export interface OpenShift {
  id: string;
  openedAt: string;
  openingCashFloat: number;
  cashierId: string;
  cashierName: string | null;
}

/** A POS device and the shift open on it now. */
export interface CurrentShift {
  registerId: string;
  registerName: string;
  shiftRule: ShiftRule;
  /** The screens this POS device shows. */
  sellsAt: PosKind[];
  shift: OpenShift | null;
  /** A daily shift is due a day after it opened; a per-login one has none. */
  dueAt: string | null;
  overdue: boolean;
}

export interface ShiftSummary {
  sessionId: string;
  registerName: string;
  cashierName: string | null;
  openedAt: string;
  closedAt: string | null;
  openingCashFloat: number;
  expectedClosingCash: number;
  actualClosingCash: number | null;
  cashVariance: number | null;
  totalSales: number;
  totalRefunds: number;
  netTotal: number;
  salesCount: number;
  refundCount: number;
  nonSalesCashIn: number;
  nonSalesCashOut: number;
  paymentBreakdown: { methodName: string; transactionCount: number; totalAmount: number }[];
}

export interface ManagerApproval {
  token: string;
  approverName: string | null;
}
