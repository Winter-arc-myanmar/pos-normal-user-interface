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
import { TableWarningStatusDTO } from "@/core/application/dtos/CashierDTO";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { isSettledSalesOrder } from "@/lib/pos/orderStatus";
import {
  isOccupiedDiningTable,
  isOpenTableSession,
  normalizeDiningTableStatus,
} from "@/lib/pos/tableSession";

const serviceTabs: Array<{ key: ServiceType; labelKey: string }> = [
  { key: "TABLE", labelKey: "cashier.serviceTypes.table" },
  { key: "DINE_IN", labelKey: "cashier.serviceTypes.dineIn" },
  { key: "TAKE_AWAY", labelKey: "cashier.serviceTypes.takeAway" },
  { key: "DELIVERY", labelKey: "cashier.serviceTypes.delivery" },
  { key: "PICK_UP", labelKey: "cashier.serviceTypes.pickUp" },
];

const statusTabs: Array<{ key: "ALL" | "DRAFT" | "CONFIRMED" | "COMPLETED"; labelKey: string }> = [
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
  getOrderCount?: (tableId: string) => number;
  getTableWarning?: (openedAt?: string | null) => TableWarningStatusDTO | null;
  notificationCount?: number;
  serviceTabCounts?: Partial<Record<ServiceType, number>>;
  statusTabCounts?: Partial<Record<"ALL" | OrderStatus, number>>;
  onNotificationsClick?: () => void;
  onServiceTypeChange: (type: ServiceType) => void;
  onStatusFilterChange: (status: "ALL" | OrderStatus) => void;
  onTableSelect: (tableId: string) => void;
  onOrderSelect: (order: SalesOrder) => void;
  onPageChange: (page: number) => void;
}

const boardTileClass =
  "relative flex h-24 items-center justify-center border border-slate-700 transition hover:border-blue-500";

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
  getOrderCount,
  getTableWarning,
  notificationCount = 0,
  serviceTabCounts,
  statusTabCounts,
  onNotificationsClick,
  onServiceTypeChange,
  onStatusFilterChange,
  onTableSelect,
  onOrderSelect,
  onPageChange,
}: CashierBoardProps) {
  const { t } = useTranslation();

  return (
    <section className="flex h-full min-h-0 flex-col p-2 min-[1100px]:p-3">
      <div className="relative flex flex-wrap items-center gap-2 pr-11">
        {serviceTabs.map((tab) => {
          const tabCount = serviceTabCounts?.[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onServiceTypeChange(tab.key)}
              className={[
                "min-h-10 rounded px-3 py-1.5 text-sm font-medium",
                serviceType === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-200 hover:bg-slate-800",
              ].join(" ")}
            >
              {t(tab.labelKey)}
              {typeof tabCount === "number" ? (
                <span className="ml-1 opacity-90">{tabCount}</span>
              ) : null}
            </button>
          );
        })}
        <div className="absolute right-0 top-0">
          <NotificationBell
            count={notificationCount}
            onClick={onNotificationsClick}
          />
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {statusTabs.map((tab) => {
          const tabCount = statusTabCounts?.[tab.key];
          return (
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
              {typeof tabCount === "number" ? ` (${tabCount})` : ""}
            </button>
          );
        })}
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
            {serviceType === "TABLE" || serviceType === "DINE_IN"
              ? tables.map((table) => {
                  const latestSession = getLatestSession(table.id);
                  const session = isOpenTableSession(latestSession)
                    ? latestSession
                    : undefined;
                  const orderCount = getOrderCount?.(table.id) || 0;
                  const selected =
                    !!selectedOrderId && session?.salesOrderId === selectedOrderId;
                  const isCircle =
                    String(table.shape || "").toUpperCase() === "CIRCLE";
                  const tableStatus = normalizeDiningTableStatus(table.status);
                  const occupied = isOccupiedDiningTable(tableStatus);
                  const warning = occupied
                    ? getTableWarning?.(session?.openedAt)
                    : null;
                  const warningClass =
                    warning?.level === "CRITICAL"
                      ? "border-red-500"
                      : warning?.level === "WARNING"
                        ? "border-amber-500"
                        : "";
                  const showCircle = isCircle && !occupied && orderCount <= 1;

                  return (
                    <button
                      key={table.id}
                      type="button"
                      className={[
                        boardTileClass,
                        showCircle ? "rounded-full" : "rounded-md",
                        selected
                          ? occupied
                            ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white"
                            : "ring-2 ring-blue-400 ring-offset-2 ring-offset-[#070707]"
                          : "",
                        occupied ? "border-slate-300 bg-white text-slate-900" : "bg-[#181818]",
                        warningClass,
                      ].join(" ")}
                      onClick={() => onTableSelect(table.id)}
                    >
                      <span
                        className={[
                          "absolute left-2 top-2 max-w-[42%] truncate text-sm font-semibold",
                          occupied ? "text-slate-900" : "",
                        ].join(" ")}
                      >
                        {table.tableNumber}
                      </span>
                      {warning ? (
                        <span
                          className={[
                            "absolute right-1.5 top-1.5 max-w-[56%] truncate rounded px-1.5 py-0.5 text-[9px] font-bold",
                            warning.level === "CRITICAL"
                              ? "bg-red-500 text-white"
                              : warning.level === "WARNING"
                                ? "bg-amber-400 text-slate-950"
                                : "bg-emerald-500 text-slate-950",
                          ].join(" ")}
                          title={t(`cashier.tableWarning.${warning.level.toLowerCase()}`)}
                        >
                          {warning.elapsedLabel}{" "}
                          {t(`cashier.tableWarning.${warning.level.toLowerCase()}`)}
                        </span>
                      ) : null}
                      {!occupied ? (
                        <span className="text-4xl leading-none text-white/90">+</span>
                      ) : session ? (
                        <span
                          className="mb-4 max-w-[90%] truncate text-[11px] font-semibold text-sky-700"
                          title={t("cashier.orderPanel.sessionState")}
                        >
                          {session.sessionState}
                        </span>
                      ) : null}
                      {orderCount > 1 ? (
                        <span className="absolute left-2 bottom-2 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                          {t("cashier.multiOrder.orderCount", {
                            count: orderCount,
                          })}
                        </span>
                      ) : null}
                      <span
                        className={[
                          "absolute bottom-1.5 max-w-[55%] truncate text-[10px]",
                          occupied ? "text-slate-600" : "text-slate-300",
                          orderCount > 1 ? "right-2" : "left-2",
                        ].join(" ")}
                        title={t("cashier.orderPanel.tableStatus")}
                      >
                        {t("cashier.orderPanel.tableStatusOption", {
                          status: tableStatus,
                        })}
                      </span>
                    </button>
                  );
                })
              : orders.map((order) => {
                  const settled = isSettledSalesOrder(order);
                  return (
                  <button
                    key={order.id}
                    type="button"
                    className={[
                      boardTileClass,
                      "rounded-md bg-[#181818]",
                      selectedOrderId === order.id ? "border-blue-500" : "",
                      settled ? "opacity-80" : "",
                    ].join(" ")}
                    onClick={() => onOrderSelect(order)}
                  >
                    <span className="absolute left-2 top-2 text-sm font-semibold">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </span>
                    {settled ? null : (
                      <span className="text-4xl leading-none text-white/90">+</span>
                    )}
                    <span className="absolute bottom-2 right-2 text-[10px] text-slate-300">
                      {order.status}
                    </span>
                  </button>
                  );
                })}
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
