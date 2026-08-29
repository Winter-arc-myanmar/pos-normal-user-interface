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
  onLogout: () => void;
  logoutLabel: string;
}

export function PosIconRail({
  items,
  userName,
  onLogout,
  logoutLabel,
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

      <button
        type="button"
        title={logoutLabel}
        aria-label={logoutLabel}
        onClick={onLogout}
        className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-slate-500 text-sm font-bold text-white"
      >
        {userName.slice(0, 1).toUpperCase()}
      </button>
      <span className="mt-1 max-w-12 truncate text-[10px] text-white/80">
        {userName}
      </span>
    </aside>
  );
}
