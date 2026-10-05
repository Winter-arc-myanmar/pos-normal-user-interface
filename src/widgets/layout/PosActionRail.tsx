import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface PosActionRailProps {
  drawerLabel: string;
  menuLabel: string;
  ordersLabel: string;
  payLabel: string;
  branchLabel: string;
  activeBranchId?: string;
  branches: string[];
  onBranchChange: (branchId: string) => void;
  onMenu: () => void;
  onOrders: () => void;
  onPay: () => void;
  activeView?: "menu" | "orders" | "pay" | null;
}

export function PosActionRail({
  drawerLabel,
  menuLabel,
  ordersLabel,
  payLabel,
  branchLabel,
  activeBranchId,
  branches,
  onBranchChange,
  onMenu,
  onOrders,
  onPay,
  activeView = null,
}: PosActionRailProps) {
  const { t } = useTranslation();
  return (
    <aside className="pos-action-rail pos-safe-y flex min-h-0 flex-col border-l border-white/10 bg-[#202020] p-1.5 text-white">
      <div className="flex flex-col items-center gap-1.5">
        {branches.length > 1 ? (
          <label className="w-full">
            <span className="sr-only">{branchLabel}</span>
            <select
              aria-label={branchLabel}
              value={activeBranchId || ""}
              onChange={(event) => onBranchChange(event.target.value)}
              className="w-full rounded border border-white/20 bg-slate-700 px-1 py-2 text-[10px] text-white"
            >
              {branches.map((branchId) => (
                <option key={branchId} value={branchId}>
                  {branchId.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <LanguageSwitcher />
        <div id="pos-tablet-print-settings" className="w-full" />
      </div>

      <div className="pos-action-buttons mt-auto flex flex-col gap-1 text-left text-xs font-medium">
        <button
          type="button"
          disabled
          title={t("shell.drawerNotConfigured")}
          className="min-h-11 w-full rounded bg-slate-500 px-2 py-2 text-left opacity-50 disabled:cursor-not-allowed"
        >
          {drawerLabel}
        </button>
        <button
          type="button"
          onClick={onMenu}
          aria-pressed={activeView === "menu"}
          className={[
            "min-h-11 w-full rounded px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
            activeView === "menu" ? "bg-blue-600" : "bg-slate-500 hover:bg-slate-600",
          ].join(" ")}
        >
          {menuLabel}
        </button>
        <button
          type="button"
          onClick={onOrders}
          aria-pressed={activeView === "orders"}
          className={[
            "min-h-11 w-full rounded px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
            activeView === "orders" ? "bg-blue-600" : "bg-slate-500 hover:bg-slate-600",
          ].join(" ")}
        >
          {ordersLabel}
        </button>
        <button
          type="button"
          onClick={onPay}
          aria-pressed={activeView === "pay"}
          className={[
            "min-h-11 w-full rounded px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
            activeView === "pay" ? "bg-blue-600" : "bg-slate-500 hover:bg-slate-600",
          ].join(" ")}
        >
          {payLabel}
        </button>
      </div>
    </aside>
  );
}
