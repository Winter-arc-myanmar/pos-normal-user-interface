import { type ReactNode, useState } from "react";
import { NavLink, type NavLinkProps } from "react-router-dom";

type SidebarItem = {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
};

type SidebarProps = {
  items: SidebarItem[];
  logo?: ReactNode;
  brandTitle?: string;
  brandSubtitle?: string;
  footer?: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  className?: string;
};

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function SidebarNavLink({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}) {
  const linkClass: NavLinkProps["className"] = ({ isActive }) =>
    [
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
      "transition-all duration-150 ease-in-out",
      "border border-transparent",
      isActive
        ? "bg-blue-50 text-blue-900 border-blue-200 font-semibold"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200",
    ].join(" ");

  return (
    <NavLink to={to} end={end} className={linkClass}>
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function Sidebar({
  items,
  logo,
  brandTitle,
  brandSubtitle,
  footer,
  collapsible = true,
  defaultExpanded = true,
  onToggle,
  className = "",
}: SidebarProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    onToggle?.(next);
  };

  return (
    <aside
      className={[
        "flex flex-col h-full bg-white border-r border-slate-200",
        "transition-all duration-200 ease-in-out",
        expanded ? "w-60" : "w-16",
        className,
      ].join(" ")}
    >
      {/* Logo / Brand Area */}
      <div
        className={[
          "flex items-center gap-3 px-4 py-4 border-b border-slate-200 min-h-[68px]",
          expanded ? "justify-start" : "justify-center",
        ].join(" ")}
      >
        {logo ? (
          <div className="flex-shrink-0">{logo}</div>
        ) : null}
        {expanded && brandTitle ? (
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">
              {brandTitle}
            </div>
            {brandSubtitle ? (
              <div className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                {brandSubtitle}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Collapse Toggle */}
      {collapsible ? (
        <button
          type="button"
          onClick={handleToggle}
          className={[
            "flex items-center justify-center w-full py-2",
            "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
            "transition-colors duration-150",
            "border-b border-slate-200",
          ].join(" ")}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <span
            className={[
              "transition-transform duration-200",
              expanded ? "" : "rotate-180",
            ].join(" ")}
          >
            <ChevronIcon />
          </span>
        </button>
      ) : null}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {items.map((item) => (
          <SidebarNavLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.end}
          />
        ))}
      </nav>

      {/* Footer */}
      {footer && expanded ? (
        <div className="border-t border-slate-200 px-4 py-3">
          {footer}
        </div>
      ) : null}
    </aside>
  );
}
