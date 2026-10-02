import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { Button } from "@/components/ui/Button";
import { SalesRefund } from "@/core/domain/entities/SalesRefund";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useRefundManagement } from "@/core/presentation/hooks/useRefundManagement";
import { useDateFormatter, useNumberFormatter } from "@/lib/i18n/formatters";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#1a9bff]";

interface DraftItem {
  key: string;
  salesOrderLineId: string;
  returnedQuantity: string;
}

const newItem = (): DraftItem => ({
  key:
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `line-${Date.now()}-${Math.random()}`,
  salesOrderLineId: "",
  returnedQuantity: "1",
});

function RefundDetails({ refund }: { refund: SalesRefund }) {
  const { t } = useTranslation();
  const { formatCurrency } = useNumberFormatter();
  const { formatDateTime } = useDateFormatter();
  const money = (value?: string) => formatCurrency(Number(value || 0));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {t("refunds.returnNumber")}
        </p>
        <h2 className="mt-1 text-lg font-bold">
          {refund.returnNumber || refund.returnId}
        </h2>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("refunds.salesOrderId")}
          </dt>
          <dd className="mt-1 break-all font-medium">{refund.salesOrderId}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("refunds.orderStatus")}
          </dt>
          <dd className="mt-1 font-medium">{refund.orderStatus || "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("refunds.refundMethod")}
          </dt>
          <dd className="mt-1 font-medium">{refund.refundMethod}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("refunds.createdAt")}
          </dt>
          <dd className="mt-1 font-medium">
            {refund.createdAt ? formatDateTime(refund.createdAt) : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("refunds.reason")}
          </dt>
          <dd className="mt-1 font-medium">{refund.reason}</dd>
        </div>
      </dl>
      <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("refunds.subtotal")}
          </p>
          <p className="mt-1 font-semibold">{money(refund.subtotalRefund)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("refunds.tax")}
          </p>
          <p className="mt-1 font-semibold">{money(refund.taxRefund)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("refunds.total")}
          </p>
          <p className="mt-1 font-semibold">{money(refund.totalRefund)}</p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold">{t("refunds.items")}</h3>
        <ul className="mt-2 divide-y divide-slate-200">
          {refund.lines.map((line) => (
            <li key={line.id || line.salesOrderLineId} className="py-3 text-sm">
              <p className="break-all font-medium">{line.salesOrderLineId}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t("refunds.returnedQty")} {line.returnedQuantity} · {t("refunds.unitPrice")}{" "}
                {money(line.unitPrice)} · {t("refunds.lineDiscount")} {money(line.lineDiscount)} ·{" "}
                {t("refunds.taxAmount")} {money(line.taxAmount)}
              </p>
              <p className="mt-1 font-semibold">{money(line.lineRefund)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function RefundsPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useNumberFormatter();
  const { user } = useAuth();
  const { activePosSessionId } = usePosWorkspace();
  const {
    refunds,
    selectedRefund,
    isLoading,
    error,
    listRefundsForOrder,
    getRefundById,
    createRefund,
    clearSelection,
  } = useRefundManagement();

  const [salesOrderId, setSalesOrderId] = useState("");
  const [loadedOrderId, setLoadedOrderId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(true);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [posSessionId, setPosSessionId] = useState(activePosSessionId || "");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const tenantId = String(user?.tenantId || "");

  const loadRefunds = async (nextPage = 1, orderId = salesOrderId) => {
    const id = orderId.trim();
    if (!id) {
      setLocalError(t("refunds.errors.missingOrder"));
      return;
    }
    setLocalError(null);
    try {
      const result = await listRefundsForOrder(id, {
        page: nextPage,
        limit: 10,
        search: search.trim() || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setLoadedOrderId(id);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch {
      // surfaced via hook error
    }
  };

  const openRefund = async (refund: SalesRefund) => {
    setShowForm(false);
    setNotice(null);
    setLocalError(null);
    try {
      await getRefundById(refund.returnId);
    } catch {
      // surfaced via hook error
    }
  };

  const processRefund = async () => {
    if (!tenantId) {
      setLocalError(t("refunds.errors.missingContext"));
      return;
    }
    const orderId = (loadedOrderId || salesOrderId).trim();
    if (!orderId) {
      setLocalError(t("refunds.errors.missingOrder"));
      return;
    }
    if (!reason.trim()) {
      setLocalError(t("refunds.errors.missingReason"));
      return;
    }
    if (!posSessionId.trim()) {
      setLocalError(t("refunds.errors.missingSession"));
      return;
    }
    const payloadItems = items
      .map((item) => ({
        salesOrderLineId: item.salesOrderLineId.trim(),
        returnedQuantity: item.returnedQuantity.trim(),
      }))
      .filter((item) => item.salesOrderLineId && Number(item.returnedQuantity) > 0);
    if (!payloadItems.length) {
      setLocalError(t("refunds.errors.missingItems"));
      return;
    }
    setLocalError(null);
    setNotice(null);
    try {
      const created = await createRefund({
        tenantId,
        salesOrderId: orderId,
        reason: reason.trim(),
        refundMethod: refundMethod.trim(),
        posSessionId: posSessionId.trim(),
        items: payloadItems,
      });
      setShowForm(false);
      setNotice(
        t("refunds.processed", {
          number: created.returnNumber || created.returnId,
          total: formatCurrency(Number(created.totalRefund || 0)),
        })
      );
      setReason("");
      setItems([newItem()]);
      if (loadedOrderId) await loadRefunds(page, loadedOrderId);
    } catch {
      // surfaced via hook error
    }
  };

  const feedback = localError || error || notice;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080808] text-white">
      <div className="flex flex-wrap items-end gap-2 px-4 pb-3 pt-4">
        <label className="min-w-0 flex-1 text-sm">
          {t("refunds.salesOrderId")}
          <input
            className="mt-1 min-h-11 w-full rounded-md border-0 bg-white px-3 text-sm text-slate-900 outline-none"
            value={salesOrderId}
            onChange={(event) => setSalesOrderId(event.target.value)}
          />
        </label>
        <label className="min-w-[12rem] flex-1 text-sm">
          {t("refunds.search")}
          <input
            className="mt-1 min-h-11 w-full rounded-md border-0 bg-white px-3 text-sm text-slate-900 outline-none"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <Button type="button" onClick={() => void loadRefunds(1)}>
          {t("refunds.load")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            clearSelection();
            setShowForm(true);
            setNotice(null);
            setLocalError(null);
          }}
        >
          {t("refunds.newRefund")}
        </Button>
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

      <div className="pos-split grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden px-4 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
        <div className="pos-pane-scroll rounded-md bg-[#101010]">
          {!loadedOrderId ? (
            <div className="flex h-full min-h-64 items-center justify-center px-6 text-center text-sm text-slate-400">
              {t("refunds.enterOrder")}
            </div>
          ) : isLoading && refunds.length === 0 ? (
            <ApiLoadingState label={t("refunds.loading")} />
          ) : refunds.length === 0 ? (
            <div className="flex h-full min-h-64 items-center justify-center px-6 text-center text-sm text-slate-400">
              {t("refunds.empty")}
            </div>
          ) : (
            <>
              <ul className="divide-y divide-white/10">
                {refunds.map((refund) => {
                  const selected = selectedRefund?.returnId === refund.returnId && !showForm;
                  return (
                    <li key={refund.returnId}>
                      <button
                        type="button"
                        onClick={() => void openRefund(refund)}
                        className={[
                          "w-full px-4 py-3 text-left transition",
                          selected ? "bg-[#1a9bff]/20" : "hover:bg-white/5",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate font-semibold">
                            {refund.returnNumber || refund.returnId}
                          </p>
                          <p className="shrink-0 font-semibold">
                            {formatCurrency(Number(refund.totalRefund || 0))}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {refund.refundMethod}
                          {refund.reason ? ` · ${refund.reason}` : ""}
                        </p>
                        {refund.orderStatus ? (
                          <span className="mt-2 inline-block rounded bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-950">
                            {refund.orderStatus}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-slate-400">
                  <span>{t("refunds.page", { page, totalPages })}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isLoading}
                      onClick={() => void loadRefunds(page - 1, loadedOrderId)}
                    >
                      {t("refunds.prev")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || isLoading}
                      onClick={() => void loadRefunds(page + 1, loadedOrderId)}
                    >
                      {t("refunds.next")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <aside className="pos-pane-scroll h-full rounded-md bg-white p-4 text-slate-900">
          {showForm ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{t("refunds.newRefund")}</h2>
              <label className="block text-sm font-medium">
                {t("refunds.salesOrderId")}
                <input
                  className={fieldClass}
                  value={loadedOrderId || salesOrderId}
                  onChange={(event) => {
                    setSalesOrderId(event.target.value);
                    setLoadedOrderId("");
                  }}
                />
              </label>
              <label className="block text-sm font-medium">
                {t("refunds.reason")}
                <input
                  className={fieldClass}
                  value={reason}
                  placeholder={t("refunds.reasonPlaceholder")}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                {t("refunds.refundMethod")}
                <input
                  className={fieldClass}
                  value={refundMethod}
                  onChange={(event) => setRefundMethod(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                {t("refunds.posSession")}
                <input
                  className={fieldClass}
                  value={posSessionId}
                  onChange={(event) => setPosSessionId(event.target.value)}
                />
              </label>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{t("refunds.items")}</h3>
                  <button
                    type="button"
                    className="text-sm font-medium text-[#1a9bff]"
                    onClick={() => setItems((current) => [...current, newItem()])}
                  >
                    {t("refunds.addItem")}
                  </button>
                </div>
                <ul className="mt-2 space-y-3">
                  {items.map((item) => (
                    <li key={item.key} className="rounded-md border border-slate-200 p-3">
                      <label className="block text-xs font-medium text-slate-600">
                        {t("refunds.lineId")}
                        <input
                          aria-label={t("refunds.lineId")}
                          className={fieldClass}
                          value={item.salesOrderLineId}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((row) =>
                                row.key === item.key
                                  ? { ...row, salesOrderLineId: event.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </label>
                      <div className="mt-2 flex items-end gap-2">
                        <label className="block flex-1 text-xs font-medium text-slate-600">
                          {t("refunds.returnedQty")}
                          <input
                            aria-label={t("refunds.returnedQty")}
                            className={fieldClass}
                            value={item.returnedQuantity}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.key === item.key
                                    ? { ...row, returnedQuantity: event.target.value }
                                    : row
                                )
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="mb-2 text-sm font-medium text-red-600"
                          onClick={() =>
                            setItems((current) =>
                              current.length === 1
                                ? [newItem()]
                                : current.filter((row) => row.key !== item.key)
                            )
                          }
                        >
                          {t("refunds.remove")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                type="button"
                fullWidth
                disabled={isLoading}
                onClick={() => void processRefund()}
              >
                {isLoading ? t("refunds.processing") : t("refunds.process")}
              </Button>
            </div>
          ) : selectedRefund ? (
            <RefundDetails refund={selectedRefund} />
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center text-center text-sm text-slate-500">
              {t("refunds.enterOrder")}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
