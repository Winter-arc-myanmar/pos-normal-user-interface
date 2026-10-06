import type {
  CashMovementKind,
  CurrentShift,
  ManagerApproval,
  ShiftSummary,
} from "../../domain/entities/Shift";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

const unwrap = (response: unknown, key: string): RecordValue => {
  const record = asRecord(response);
  return "data" in record && !(key in record) ? unwrap(record.data, key) : record;
};

const money = (value: unknown) => Number(value ?? 0) || 0;
const moneyOrNull = (value: unknown) => (value == null ? null : money(value));

const toCurrent = (response: unknown): CurrentShift => {
  const body = unwrap(response, "registerId");
  const shift = body.shift ? asRecord(body.shift) : null;
  return {
    registerId: String(body.registerId || ""),
    registerName: String(body.registerName || ""),
    mode: body.mode === "ROOM" ? "ROOM" : "CASHIER",
    shift: shift
      ? {
          id: String(shift.id || ""),
          openedAt: String(shift.openedAt || ""),
          openingCashFloat: money(shift.openingCashFloat),
          cashierId: String(shift.cashierId || ""),
          cashierName: shift.cashierName ? String(shift.cashierName) : null,
        }
      : null,
    dueAt: body.dueAt ? String(body.dueAt) : null,
    overdue: Boolean(body.overdue),
  };
};

const toSummary = (response: unknown): ShiftSummary => {
  const body = unwrap(response, "sessionId");
  const breakdown = Array.isArray(body.paymentBreakdown) ? body.paymentBreakdown : [];
  return {
    sessionId: String(body.sessionId || ""),
    registerName: String(body.registerName || ""),
    cashierName: body.cashierName ? String(body.cashierName) : null,
    openedAt: String(body.openedAt || ""),
    closedAt: body.closedAt ? String(body.closedAt) : null,
    openingCashFloat: money(body.openingCashFloat),
    expectedClosingCash: money(body.expectedClosingCash),
    actualClosingCash: moneyOrNull(body.actualClosingCash),
    cashVariance: moneyOrNull(body.cashVariance),
    totalSales: money(body.totalSales),
    totalRefunds: money(body.totalRefunds),
    netTotal: money(body.netTotal),
    salesCount: Number(body.salesCount || 0),
    refundCount: Number(body.refundCount || 0),
    nonSalesCashIn: money(body.nonSalesCashIn),
    nonSalesCashOut: money(body.nonSalesCashOut),
    paymentBreakdown: breakdown.map((row) => {
      const item = asRecord(row);
      return {
        methodName: String(item.methodName || ""),
        transactionCount: Number(item.transactionCount || 0),
        totalAmount: money(item.totalAmount),
      };
    }),
  };
};

const decimal = (amount: number) => amount.toFixed(4);

export class ApiShiftRepository {
  constructor(private httpClient: HttpClient) {}

  async current(registerId: string): Promise<CurrentShift> {
    return toCurrent(
      await this.httpClient.get(API_ENDPOINTS.POS_SESSIONS.CURRENT, { params: { registerId } })
    );
  }

  async open(input: { tenantId: string; registerId: string; cashierId: string; openingCashFloat: number }) {
    const response = await this.httpClient.post(API_ENDPOINTS.POS_SESSIONS.CREATE, {
      tenantId: input.tenantId,
      registerId: input.registerId,
      cashierId: input.cashierId,
      openingCashFloat: decimal(input.openingCashFloat),
    });
    return String(unwrap(response, "id").id || "");
  }

  async summary(sessionId: string): Promise<ShiftSummary> {
    return toSummary(await this.httpClient.get(API_ENDPOINTS.POS_SESSIONS.SUMMARY(sessionId)));
  }

  async close(sessionId: string, counted: number, approverToken?: string): Promise<ShiftSummary> {
    return toSummary(
      await this.httpClient.post(
        API_ENDPOINTS.POS_SESSIONS.CLOSE(sessionId),
        { actualClosingCash: decimal(counted) },
        approverToken ? { headers: { "x-approver-authorization": approverToken } } : undefined
      )
    );
  }

  async recordCash(input: {
    posSessionId: string;
    locationId: string;
    paymentMethodId: string;
    kind: CashMovementKind;
    amount: number;
    notes?: string;
  }): Promise<void> {
    await this.httpClient.post(API_ENDPOINTS.CASH_MOVEMENTS.CREATE, {
      posSessionId: input.posSessionId,
      locationId: input.locationId,
      paymentMethodId: input.paymentMethodId,
      direction: input.kind === "PAID_IN" ? "IN" : "OUT",
      reason: input.kind,
      amount: decimal(input.amount),
      ...(input.notes ? { notes: input.notes } : {}),
    });
  }

  /** A manager types their own login on this till; the token approves one thing for 5 minutes. */
  async approve(userId: string, password: string, permission: string): Promise<ManagerApproval> {
    const body = unwrap(
      await this.httpClient.post(API_ENDPOINTS.AUTH.APPROVE, { userId, password, permission }),
      "approval_token"
    );
    const approver = asRecord(body.approver);
    return {
      token: String(body.approval_token || ""),
      approverName: approver.fullName ? String(approver.fullName) : null,
    };
  }
}
