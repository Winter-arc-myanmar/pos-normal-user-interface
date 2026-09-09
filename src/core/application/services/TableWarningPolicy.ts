import {
  TableWarningPolicyDTO,
  TableWarningStatusDTO,
} from "../dtos/CashierDTO";

export const DEFAULT_TABLE_WARNING_POLICY: TableWarningPolicyDTO = {
  warningAfterMinutes: 60,
  criticalAfterMinutes: 90,
};

export const formatElapsedLabel = (elapsedMinutes: number): string => {
  const safeMinutes = Math.max(0, Math.floor(elapsedMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const getTableWarningStatus = (
  openedAt?: string | null,
  nowMs: number = Date.now(),
  policy: TableWarningPolicyDTO = DEFAULT_TABLE_WARNING_POLICY
): TableWarningStatusDTO | null => {
  if (!openedAt) return null;
  const openedMs = new Date(openedAt).getTime();
  if (!Number.isFinite(openedMs) || openedMs <= 0) return null;

  const elapsedMinutes = Math.max(0, Math.floor((nowMs - openedMs) / 60000));
  const warningAfter = Math.max(1, policy.warningAfterMinutes);
  const criticalAfter = Math.max(warningAfter, policy.criticalAfterMinutes);

  let level: TableWarningStatusDTO["level"] = "OK";
  if (elapsedMinutes >= criticalAfter) level = "CRITICAL";
  else if (elapsedMinutes >= warningAfter) level = "WARNING";

  return {
    level,
    elapsedMinutes,
    elapsedLabel: formatElapsedLabel(elapsedMinutes),
  };
};

export class TableWarningPolicy {
  static defaultPolicy(): TableWarningPolicyDTO {
    return { ...DEFAULT_TABLE_WARNING_POLICY };
  }

  static resolve(
    openedAt?: string | null,
    nowMs: number = Date.now(),
    policy: TableWarningPolicyDTO = DEFAULT_TABLE_WARNING_POLICY
  ): TableWarningStatusDTO | null {
    return getTableWarningStatus(openedAt, nowMs, policy);
  }
}
