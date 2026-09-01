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
}: PosActionRailProps) {
  return (
    <aside className="pos-safe-y flex min-h-0 flex-col border-l border-white/10 bg-[#202020] p-1.5 text-white">
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
      </div>

      <div className="mt-auto grid grid-cols-2 gap-1 text-center text-[10px] font-medium">
        <button
          type="button"
          disabled
          title="Cash drawer API is not configured"
          className="min-h-14 rounded bg-[#7165ee] px-1 py-2 opacity-50"
        >
          {drawerLabel}
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="min-h-14 rounded bg-[#287fe7] px-1 py-2"
        >
          {menuLabel}
        </button>
        <button
          type="button"
          onClick={onOrders}
          className="min-h-14 rounded bg-[#f2aa2f] px-1 py-2 text-slate-950"
        >
          {ordersLabel}
        </button>
        <button
          type="button"
          onClick={onPay}
          className="min-h-14 rounded bg-[#39c786] px-1 py-2 text-slate-950"
        >
          {payLabel}
        </button>
      </div>
    </aside>
  );
}
