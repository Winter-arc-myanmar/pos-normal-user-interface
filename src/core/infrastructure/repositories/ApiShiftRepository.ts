import type {
  CurrentShift,
  PosKind,
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

const POS_KINDS: PosKind[] = ["BAR", "KTV", "SPA"];
const sellsAtOf = (value: unknown): PosKind[] => {
  const kinds = Array.isArray(value) ? POS_KINDS.filter((kind) => value.includes(kind)) : [];
  return kinds.length ? kinds : POS_KINDS;
};
const moneyOrNull = (value: unknown) => (value == null ? null : money(value));

const toCurrent = (response: unknown): CurrentShift => {
  const body = unwrap(response, "registerId");
  const shift = body.shift ? asRecord(body.shift) : null;
  return {
    registerId: String(body.registerId || ""),
    registerName: String(body.registerName || ""),
    shiftRule: body.shiftRule === "DAILY" ? "DAILY" : "PER_LOGIN",
    sellsAt: sellsAtOf(body.sellsAt),
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

export class ApiShiftRepository {
  constructor(private httpClient: HttpClient) {}

  async current(registerId: string): Promise<CurrentShift> {
    return toCurrent(
      await this.httpClient.get(API_ENDPOINTS.POS_SESSIONS.CURRENT, { params: { registerId } })
    );
  }

  /** Opens a shift for whoever is signed in; the drawer is not counted. */
  async open(input: { tenantId: string; registerId: string; cashierId: string }) {
    const response = await this.httpClient.post(API_ENDPOINTS.POS_SESSIONS.CREATE, {
      tenantId: input.tenantId,
      registerId: input.registerId,
      cashierId: input.cashierId,
      openingCashFloat: "0.0000",
    });
    return String(unwrap(response, "id").id || "");
  }

  async summary(sessionId: string): Promise<ShiftSummary> {
    return toSummary(await this.httpClient.get(API_ENDPOINTS.POS_SESSIONS.SUMMARY(sessionId)));
  }

  /** Closes the shift for its sales report; nobody counts the drawer. */
  async close(sessionId: string): Promise<ShiftSummary> {
    return toSummary(await this.httpClient.post(API_ENDPOINTS.POS_SESSIONS.CLOSE(sessionId), {}));
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
