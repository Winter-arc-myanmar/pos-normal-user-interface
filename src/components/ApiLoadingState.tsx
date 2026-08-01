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
      className={`apiLoadingState${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="apiLoadingSpinner" aria-hidden="true">
        <span className="apiLoadingSpinnerDot" />
      </span>
      <span className="apiLoadingLabel">{label}</span>
    </div>
  );
}
