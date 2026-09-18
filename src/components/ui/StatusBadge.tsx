import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type StatusVariant =
  | "verified"
  | "pending"
  | "inactive"
  | "approved"
  | "awaiting_instruction"
  | "rejected";

type Size = "sm" | "md" | "lg";

type StatusBadgeProps = {
  variant: StatusVariant;
  size?: Size;
  children?: ReactNode;
  className?: string;
};

const variantStyles: Record<StatusVariant, string> = {
  verified:
    "bg-green-100 text-green-800 border-green-200",
  pending:
    "bg-amber-100 text-amber-800 border-amber-200",
  inactive:
    "bg-slate-100 text-slate-600 border-slate-200",
  approved:
    "bg-emerald-100 text-emerald-800 border-emerald-200",
  awaiting_instruction:
    "bg-blue-100 text-blue-800 border-blue-200",
  rejected:
    "bg-red-100 text-red-800 border-red-200",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-[11px]",
  lg: "px-3 py-1.5 text-[12px]",
};

const defaultLabelKeys: Record<StatusVariant, string> = {
  verified: "statusBadge.verified",
  pending: "statusBadge.pending",
  inactive: "statusBadge.inactive",
  approved: "statusBadge.approved",
  awaiting_instruction: "statusBadge.awaitingInstruction",
  rejected: "statusBadge.rejected",
};

export function StatusBadge({
  variant,
  size = "md",
  children,
  className = "",
}: StatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        "inline-flex items-center font-semibold rounded-full border",
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(" ")}
    >
      {children ?? t(defaultLabelKeys[variant])}
    </span>
  );
}
