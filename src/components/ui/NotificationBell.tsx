import { useTranslation } from "react-i18next";

interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
  label?: string;
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function NotificationBell({
  count = 0,
  onClick,
  className = "",
  iconClassName = "h-5 w-5",
  label,
}: NotificationBellProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label || t("cashier.notifications.label")}
      className={[
        "relative inline-flex h-10 w-10 items-center justify-center rounded text-white/90 transition hover:bg-white/10 hover:text-white",
        className,
      ].join(" ")}
    >
      <BellIcon className={iconClassName} />
      {count > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
