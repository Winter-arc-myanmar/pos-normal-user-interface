import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export interface PosRailItem {
  to: string;
  label: string;
  icon: ReactNode;
  visible: boolean;
}

interface PosIconRailProps {
  items: PosRailItem[];
  userName: string;
  profileLabel: string;
  printerLabel?: string;
  printerBadgeCount?: number;
  onProfileClick: () => void;
  onPrinterClick?: () => void;
}

function PrinterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 9V3h12v6" />
      <rect x="6" y="13" width="12" height="8" rx="1" />
      <path d="M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

export function PosIconRail({
  items,
  userName,
  profileLabel,
  printerLabel,
  printerBadgeCount = 0,
  onProfileClick,
  onPrinterClick,
}: PosIconRailProps) {
  return (
    <aside className="pos-safe-y flex min-h-0 flex-col items-center border-r border-white/10 bg-black px-1.5 py-2 text-white">
      <div
        className="mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-sm font-black text-black"
        aria-hidden="true"
      >
        V
      </div>

      <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
        {items
          .filter((item) => item.visible)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors",
                  isActive
                    ? "bg-[#087cf0] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
                    : "text-white/85 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              {item.icon}
            </NavLink>
          ))}
      </nav>

      {onPrinterClick ? (
        <button
          type="button"
          title={printerLabel}
          aria-label={printerLabel}
          onClick={onPrinterClick}
          className="relative mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white/85 transition hover:bg-white/10 hover:text-white"
        >
          <PrinterIcon />
          {printerBadgeCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {printerBadgeCount > 9 ? "9+" : printerBadgeCount}
            </span>
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        title={profileLabel}
        aria-label={profileLabel}
        onClick={onProfileClick}
        className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-slate-500 text-sm font-bold text-white transition hover:border-white/60 hover:bg-slate-400"
      >
        {userName.slice(0, 1).toUpperCase()}
      </button>
      <span className="mt-1 max-w-12 truncate text-[10px] text-white/80">
        {userName}
      </span>
    </aside>
  );
}
