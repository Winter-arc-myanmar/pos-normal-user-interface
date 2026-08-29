import { useTranslation } from "react-i18next";
import {
  OrderStatus,
  ServiceType,
} from "@/core/application/dtos/CashierDTO";
import {
  DiningTable,
  SalesOrder,
  TableSession,
} from "@/core/domain/entities/Cashier";
import { ApiLoadingState } from "@/components/ApiLoadingState";

const serviceTabs: Array<{ key: ServiceType; labelKey: string }> = [
  { key: "TABLE", labelKey: "cashier.serviceTypes.table" },
  { key: "DINE_IN", labelKey: "cashier.serviceTypes.dineIn" },
  { key: "TAKE_AWAY", labelKey: "cashier.serviceTypes.takeAway" },
  { key: "DELIVERY", labelKey: "cashier.serviceTypes.delivery" },
  { key: "PICK_UP", labelKey: "cashier.serviceTypes.pickUp" },
];

const statusTabs: Array<{ key: "ALL" | OrderStatus; labelKey: string }> = [
  { key: "ALL", labelKey: "cashier.status.all" },
  { key: "DRAFT", labelKey: "cashier.status.pending" },
  { key: "CONFIRMED", labelKey: "cashier.status.placed" },
  { key: "COMPLETED", labelKey: "cashier.status.paid" },
];

interface CashierBoardProps {
  serviceType: ServiceType;
  statusFilter: "ALL" | OrderStatus;
  tables: DiningTable[];
  orders: SalesOrder[];
  selectedOrderId?: string;
  isLoading: boolean;
  error?: string | null;
  page: number;
  pageCount: number;
  getLatestSession: (tableId: string) => TableSession | undefined;
  onServiceTypeChange: (type: ServiceType) => void;
  onStatusFilterChange: (status: "ALL" | OrderStatus) => void;
  onTableSelect: (tableId: string) => void;
  onOrderSelect: (order: SalesOrder) => void;
  onPageChange: (page: number) => void;
}

const boardTileClass =
  "relative flex h-24 items-center justify-center border border-slate-700 bg-[#181818] transition hover:border-blue-500";

export function CashierBoard({
  serviceType,
  statusFilter,
  tables,
  orders,
  selectedOrderId,
  isLoading,
  error,
  page,
  pageCount,
  getLatestSession,
  onServiceTypeChange,
  onStatusFilterChange,
  onTableSelect,
  onOrderSelect,
  onPageChange,
}: CashierBoardProps) {
  const { t } = useTranslation();

  return (
    <section className="flex h-full min-h-0 flex-col p-2 min-[1100px]:p-3">
      <div className="flex flex-wrap items-center gap-2">
        {serviceTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onServiceTypeChange(tab.key)}
            className={[
              "min-h-10 rounded px-3 py-1.5 text-sm",
              serviceType === tab.key
                ? "bg-blue-600 text-white"
                : "text-slate-200 hover:bg-slate-800",
            ].join(" ")}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatusFilterChange(tab.key)}
            className={[
              "min-h-8 rounded px-2 py-1 text-xs",
              statusFilter === tab.key
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-300",
            ].join(" ")}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-2 rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {isLoading && tables.length === 0 && orders.length === 0 ? (
          <ApiLoadingState label={t("cashier.loading")} />
        ) : (
          <div className="grid grid-cols-3 gap-2 min-[900px]:grid-cols-4 min-[1200px]:grid-cols-5">
            {serviceType === "TABLE"
              ? tables.map((table) => {
                  const session = getLatestSession(table.id);
                  const selected =
                    !!selectedOrderId && session?.salesOrderId === selectedOrderId;
                  const isCircle =
                    String(table.shape || "").toUpperCase() === "CIRCLE";

                  return (
                    <button
                      key={table.id}
                      type="button"
                      className={[
                        boardTileClass,
                        isCircle ? "rounded-full" : "rounded-md",
                        selected ? "border-blue-500" : "",
                      ].join(" ")}
                      onClick={() => onTableSelect(table.id)}
                    >
                      <span className="absolute left-2 top-2 text-sm font-semibold">
                        {table.tableNumber}
                      </span>
                      <span className="text-4xl leading-none text-white/90">+</span>
                      <span className="absolute bottom-2 right-2 text-[10px] text-slate-300">
                        {session?.sessionState || table.status}
                      </span>
                    </button>
                  );
                })
              : orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className={[
                      boardTileClass,
                      "rounded-md",
                      selectedOrderId === order.id ? "border-blue-500" : "",
                    ].join(" ")}
                    onClick={() => onOrderSelect(order)}
                  >
                    <span className="absolute left-2 top-2 text-sm font-semibold">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </span>
                    <span className="text-4xl leading-none text-white/90">+</span>
                    <span className="absolute bottom-2 right-2 text-[10px] text-slate-300">
                      {order.status}
                    </span>
                  </button>
                ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-10 w-10 rounded bg-white text-xl text-black disabled:opacity-30"
          aria-label="Previous"
        >
          ←
        </button>
        <span className="text-xs text-slate-400">
          {page} / {Math.max(1, pageCount)}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="h-10 w-10 rounded bg-white text-xl text-black disabled:opacity-30"
          aria-label="Next"
        >
          →
        </button>
      </div>
    </section>
  );
}
