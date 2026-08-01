type ApiLoadingStateProps = {
  label: string;
  compact?: boolean;
  className?: string;
};

export function ApiLoadingState({
  label,
  compact = false,
  className = "",
}: ApiLoadingStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400",
        compact ? "min-h-32 py-6" : "min-h-56 py-10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
