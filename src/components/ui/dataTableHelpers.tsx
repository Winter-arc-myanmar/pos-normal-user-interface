import type { ReactNode } from "react";
import { StatusBadge, type StatusVariant } from "./StatusBadge";

/**
 * Helper: renders a status badge cell for a given status value.
 * Maps common status strings to StatusBadge variants.
 */
export function statusCell(value: string): ReactNode {
  const variantMap: Record<string, StatusVariant> = {
    verified: "verified",
    pending: "pending",
    inactive: "inactive",
    approved: "approved",
    awaiting_instruction: "awaiting_instruction",
    rejected: "rejected",
  };

  const variant = variantMap[value.toLowerCase()] ?? "pending";
  return <StatusBadge variant={variant} />;
}
