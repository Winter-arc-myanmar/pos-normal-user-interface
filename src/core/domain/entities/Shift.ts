export type RegisterMode = "CASHIER" | "ROOM";

export interface OpenShift {
  id: string;
  openedAt: string;
  openingCashFloat: number;
  cashierId: string;
  cashierName: string | null;
}

/** A till and the shift open on it now. */
export interface CurrentShift {
  registerId: string;
  registerName: string;
  mode: RegisterMode;
  shift: OpenShift | null;
  /** A room board's shift is due a day after it opened; a cashier's has none. */
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

export type CashMovementKind = "PAID_IN" | "PAID_OUT" | "DROP";

export interface ManagerApproval {
  token: string;
  approverName: string | null;
}
