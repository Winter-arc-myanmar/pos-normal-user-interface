import { useTranslation } from "react-i18next";

interface OrderTabsProps {
  orderIds: string[];
  activeOrderId?: string;
  disabled?: boolean;
  onSelect: (orderId: string) => void;
  onAdd: () => void;
  onManage: () => void;
}

export function OrderTabs({
  orderIds,
  activeOrderId,
  disabled,
  onSelect,
  onAdd,
  onManage,
}: OrderTabsProps) {
  const { t } = useTranslation();

  if (!orderIds.length) return null;

  return (
    <div className="mb-3 flex items-center gap-1 border-b border-slate-200 pb-2">
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {orderIds.map((orderId, index) => (
          <button
            key={orderId}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(orderId)}
            aria-label={t("cashier.multiOrder.orderTab", { number: index + 1 })}
            className={[
              "h-8 min-w-8 rounded px-2 text-xs font-semibold transition",
              activeOrderId === orderId
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            ].join(" ")}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        aria-label={t("cashier.multiOrder.newOrder")}
        className="h-8 w-8 shrink-0 rounded bg-emerald-500 text-lg font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        +
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onManage}
        aria-label={t("cashier.multiOrder.manage")}
        className="h-8 w-8 shrink-0 rounded bg-slate-700 text-sm font-bold text-white hover:bg-slate-600 disabled:opacity-50"
      >
        •••
      </button>
    </div>
  );
}
