import type { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    direction: "up" | "down";
    value: string;
    positive?: boolean;
  };
  variant?: "default" | "primary";
  className?: string;
};

function TrendUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 19 7-7-7-7" />
    </svg>
  );
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className = "",
}: MetricCardProps) {
  const isPrimary = variant === "primary";

  return (
    <div
      className={[
        "relative rounded-xl border p-5",
        "transition-all duration-200 ease-in-out",
        "hover:shadow-md hover:-translate-y-0.5",
        isPrimary
          ? "bg-blue-900 border-blue-900 text-white"
          : "bg-white border-slate-200 shadow-sm",
        className,
      ].join(" ")}
    >
      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between gap-3">
        {icon ? (
          <div
            className={[
              "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
              isPrimary
                ? "bg-white/15 text-white"
                : "bg-blue-50 text-blue-900",
            ].join(" ")}
          >
            {icon}
          </div>
        ) : (
          <div className="w-10" />
        )}

        {trend ? (
          <span
            className={[
              "inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5",
              trend.direction === "up"
                ? trend.positive !== false
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
                : trend.positive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700",
              isPrimary ? "bg-white/15 text-white" : "",
            ].join(" ")}
          >
            {trend.direction === "up" ? <TrendUpIcon /> : <TrendDownIcon />}
            {trend.value}
          </span>
        ) : null}
      </div>

      {/* Title — metric label: slate-500 */}
      <p
        className={[
          "mt-3 text-xs font-medium tracking-wide",
          isPrimary ? "text-blue-100" : "text-slate-500",
        ].join(" ")}
      >
        {title}
      </p>

      {/* Value — metric value: slate-900 */}
      <p
        className={[
          "mt-1.5 text-2xl font-bold tracking-tight",
          isPrimary ? "text-white" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </p>

      {/* Subtitle — helper text: slate-500 */}
      {subtitle ? (
        <p
          className={[
            "mt-1.5 text-xs leading-relaxed",
            isPrimary ? "text-blue-100" : "text-slate-500",
          ].join(" ")}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
