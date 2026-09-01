import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { OrderStatus } from "@/core/application/dtos/CashierDTO";
import { SalesOrder } from "@/core/domain/entities/Cashier";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useSalesOrderManagement } from "@/core/presentation/hooks/useSalesOrderManagement";
import { useDateFormatter } from "@/lib/i18n/formatters";

type StatusTab = "storing" | "takenOut" | "invalid";

const statusTabFilters: Record<StatusTab, OrderStatus | undefined> = {
  storing: "DRAFT",
  takenOut: "COMPLETED",
  invalid: "CANCELLED",
};

function EmptyIllustration() {
  return (
    <svg
      viewBox="0 0 120 96"
      className="mx-auto h-24 w-28 text-slate-500"
      aria-hidden="true"
    >
      <rect x="22" y="20" width="76" height="58" rx="6" fill="currentColor" opacity="0.2" />
      <rect x="30" y="30" width="44" height="4" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="30" y="40" width="56" height="4" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="30" y="50" width="48" height="4" rx="2" fill="currentColor" opacity="0.35" />
      <path
        d="M78 12 L96 8 L90 28 Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

export function SalesOrdersPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormatter();
  const { user } = useAuth();
  const { activeLocationId } = usePosWorkspace();
  const {
    orders,
    page,
    totalPages,
    selectedOrder,
    orderLines,
    isLoading,
    error,
    fetchOrders,
    fetchOrderById,
    fetchOrderLines,
    createOrder,
    deleteOrder,
    fireOrderLine,
    readyOrderLine,
    serveOrderLine,
    clearSelectedOrder,
  } = useSalesOrderManagement();

  const [statusTab, setStatusTab] = useState<StatusTab>("storing");
  const [search, setSearch] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const tenantId = String(user?.tenantId || "");
  const locationId = activeLocationId;

  const statusFilter = statusTabFilters[statusTab];

  useEffect(() => {
    void fetchOrders({
      page: 1,
      limit: 20,
      search: search.trim() || undefined,
      status: statusFilter,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  }, [fetchOrders, search, statusFilter]);

  const visibleOrders = useMemo(() => orders, [orders]);

  const handleSelectOrder = async (order: SalesOrder) => {
    setLocalError(null);
    setNotice(null);
    try {
      await fetchOrderById(order.id);
      await fetchOrderLines(order.id, { page: 1, limit: 50 });
    } catch {
      // surfaced via hook error
    }
  };

  const handleCreateOrder = async () => {
    if (!tenantId || !locationId) {
      setLocalError(t("salesOrders.errors.missingContext"));
      return;
    }
    setLocalError(null);
    setNotice(null);
    try {
      const order = await createOrder({
        tenantId,
        locationId,
        salesChannel: "POS",
        idempotencyKey: `sales-order-${Date.now()}`,
        subtotal: "0.0000",
        totalDiscount: "0.0000",
        totalTax: "0.0000",
        grandTotal: "0.0000",
        status: "DRAFT",
      });
      setNotice(t("salesOrders.created", { number: order.orderNumber || order.id }));
      await fetchOrderLines(order.id, { page: 1, limit: 50 });
    } catch {
      // surfaced via hook error
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    setLocalError(null);
    try {
      await deleteOrder(selectedOrder.id);
      clearSelectedOrder();
      setNotice(t("salesOrders.deleted"));
      await fetchOrders({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
    } catch {
      // surfaced via hook error
    }
  };

  const runLineAction = async (
    lineId: string,
    action: "fire" | "ready" | "serve"
  ) => {
    if (!selectedOrder) return;
    setLocalError(null);
    try {
      if (action === "fire") await fireOrderLine(selectedOrder.id, lineId);
      if (action === "ready") await readyOrderLine(selectedOrder.id, lineId);
      if (action === "serve") await serveOrderLine(selectedOrder.id, lineId);
      setNotice(t("salesOrders.lineUpdated"));
    } catch {
      // surfaced via hook error
    }
  };

  const feedback = localError || error || notice;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080808] text-white">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["storing", "takenOut", "invalid"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusTab(tab);
                clearSelectedOrder();
              }}
              className={[
                "min-h-10 rounded-md px-4 text-sm font-medium transition",
                statusTab === tab
                  ? "bg-[#087cf0] text-white"
                  : "bg-white text-slate-900 hover:bg-slate-100",
              ].join(" ")}
            >
              {t(`salesOrders.tabs.${tab}`)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleCreateOrder()}
          disabled={isLoading}
          aria-label={t("salesOrders.create")}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-[#39c786] text-2xl font-light text-slate-950 transition hover:brightness-110 disabled:opacity-50"
        >
          +
        </button>
      </header>

      <div className="px-4 pb-3">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("salesOrders.search")}
          className="w-full rounded-md border-0 bg-white text-slate-900"
        />
      </div>

      {feedback ? (
        <p
          role={localError || error ? "alert" : "status"}
          className={[
            "mx-4 mb-3 rounded px-3 py-2 text-sm",
            localError || error
              ? "bg-red-950/50 text-red-200"
              : "bg-emerald-950/40 text-emerald-200",
          ].join(" ")}
        >
          {feedback}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] gap-3 overflow-hidden px-4 pb-4">
        <div className="min-h-0 overflow-y-auto rounded-md bg-[#101010]">
          {isLoading && visibleOrders.length === 0 ? (
            <ApiLoadingState label={t("salesOrders.loading")} />
          ) : visibleOrders.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
              <EmptyIllustration />
              <p className="mt-4 text-sm text-slate-400">{t("salesOrders.empty")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {visibleOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      aria-label={order.orderNumber || order.id}
                      onClick={() => void handleSelectOrder(order)}
                      className={[
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition",
                        isSelected ? "bg-[#087cf0]/20" : "hover:bg-white/5",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {order.orderNumber || order.id.slice(0, 8)}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {order.pickupNumber
                            ? `${t("salesOrders.pickup")} ${order.pickupNumber}`
                            : order.serviceType}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{order.grandTotal}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-slate-400">
              <span>
                {t("salesOrders.page", { page, totalPages })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() =>
                    void fetchOrders({
                      page: page - 1,
                      limit: 20,
                      search: search.trim() || undefined,
                      status: statusFilter,
                      sortBy: "createdAt",
                      sortOrder: "desc",
                    })
                  }
                >
                  {t("salesOrders.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isLoading}
                  onClick={() =>
                    void fetchOrders({
                      page: page + 1,
                      limit: 20,
                      search: search.trim() || undefined,
                      status: statusFilter,
                      sortBy: "createdAt",
                      sortOrder: "desc",
                    })
                  }
                >
                  {t("salesOrders.next")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md bg-[#101010]">
          {selectedOrder ? (
            <>
              <div className="border-b border-white/10 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {t("salesOrders.detailTitle")}
                    </p>
                    <h2 className="text-lg font-bold">
                      {selectedOrder.orderNumber || selectedOrder.id}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {selectedOrder.status} · {selectedOrder.salesChannel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedOrder}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isLoading}
                    onClick={() => void handleDeleteOrder()}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("salesOrders.lines")}
                </p>
                {orderLines.length === 0 ? (
                  <p className="text-sm text-slate-500">{t("salesOrders.noLines")}</p>
                ) : (
                  <ul className="space-y-2">
                    {orderLines.map((line) => (
                      <li
                        key={line.id}
                        className="rounded border border-white/10 bg-black/30 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {line.variantId.slice(0, 8)}
                            </p>
                            <p className="text-xs text-slate-400">
                              × {line.quantity} @ {line.unitPrice}
                            </p>
                          </div>
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase">
                            {line.status || "PENDING"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="rounded bg-slate-700 px-2 py-1 text-[10px]"
                            onClick={() => void runLineAction(line.id, "fire")}
                          >
                            {t("salesOrders.fire")}
                          </button>
                          <button
                            type="button"
                            className="rounded bg-slate-700 px-2 py-1 text-[10px]"
                            onClick={() => void runLineAction(line.id, "ready")}
                          >
                            {t("salesOrders.ready")}
                          </button>
                          <button
                            type="button"
                            className="rounded bg-slate-700 px-2 py-1 text-[10px]"
                            onClick={() => void runLineAction(line.id, "serve")}
                          >
                            {t("salesOrders.serve")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-white/10 px-4 py-3">
                <div className="flex items-center justify-between font-semibold">
                  <span>{t("salesOrders.total")}</span>
                  <span>{selectedOrder.grandTotal}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
              <EmptyIllustration />
              <p className="mt-4 text-sm text-slate-500">
                {t("salesOrders.selectOrder")}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
