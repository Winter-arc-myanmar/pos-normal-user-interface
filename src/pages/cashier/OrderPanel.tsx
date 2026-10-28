import { useEffect, useId, useMemo, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import {
  DiningTableStatus,
  TableSessionState,
} from "@/core/application/dtos/CashierDTO";
import {
  AdjustmentReason,
  DiningTable,
  PaymentMethod,
  Product,
  ProductVariant,
  SalesOrder,
  SalesOrderLine,
  TableSession,
} from "@/core/domain/entities/Cashier";
import { OrderTabs } from "./OrderTabs";
import { OrderAdjustments } from "./OrderAdjustments";
import { isSettledSalesOrder } from "@/lib/pos/orderStatus";
import { isPendingKdsLine } from "@/lib/pos/kdsLines";
import { isFocLine } from "@/lib/pos/checkoutAdjustments";
import type {
  PromotionDiscount,
  RunningPromotion,
} from "@/core/domain/entities/Promotion";
import {
  appliedPromotionDiscount,
  linePromotionSaving,
  promotionSummary,
} from "@/lib/pos/promotions";
import {
  formatPosMoney,
  lineDisplayName,
  variantDisplayName,
} from "@/lib/pos/orderListDisplay";

export type GroupedSalesOrderLine = SalesOrderLine & {
  groupedLines?: SalesOrderLine[];
  groupedLineIds?: string[];
};

/**
 * One row for one ordered item. Post-KDS additions stay as separate pending
 * bill lines so the kitchen receives them, while the cashier still sees a
 * single combined quantity.
 */
export function groupOrderLines(lines: SalesOrderLine[]): GroupedSalesOrderLine[] {
  const groups = new Map<string, SalesOrderLine[]>();
  for (const line of lines) {
    const key = JSON.stringify([
      line.variantId,
      Number(line.unitPrice || 0).toFixed(4),
      Number(line.lineDiscount || 0).toFixed(4),
      line.selectedModifiers ?? null,
      line.status === "VOIDED" || line.status === "COMPED" ? line.status : "",
    ]);
    groups.set(key, [...(groups.get(key) || []), line]);
  }
  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];
    const pending = group.find(isPendingKdsLine);
    const representative = pending ?? group[0];
    const quantity = group.reduce(
      (total, line) => total + Number(line.quantity || 0),
      0
    );
    return Object.assign(new SalesOrderLine(representative), {
      quantity: quantity.toFixed(4),
      groupedLines: group,
      groupedLineIds: group.map((line) => line.id),
    });
  });
}

interface OrderPanelProps {
  selectedOrder: SalesOrder | null;
  selectedOrderLines: SalesOrderLine[];
  billLines?: SalesOrderLine[];
  products: Product[];
  variantsByProductId: Record<string, ProductVariant[]>;
  paymentMethods: PaymentMethod[];
  paymentMethodId: string;
  paymentAmount: string;
  total: string;
  selectedTable: DiningTable | null;
  selectedSession: TableSession | null;
  paymentInputRef: RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  checkoutBlocked?: boolean;
  includeTax?: boolean;
  canCreateOrder?: boolean;
  isDineInService?: boolean;
  feedback?: string | null;
  errorMessage?: string | null;
  tableOrderIds?: string[];
  onCreateOrder: () => void;
  onSelectTableOrder?: (orderId: string) => void;
  onAddTableOrder?: () => void;
  onManageTableOrders?: () => void;
  onIncreaseLineQuantity: (line: SalesOrderLine) => void;
  onDecreaseLineQuantity: (line: SalesOrderLine) => void;
  onRemoveLine: (line: SalesOrderLine) => void;
  onToggleFoc?: (line: SalesOrderLine) => void;
  /** Promotions running at this till, as the server tells them. */
  promotions?: RunningPromotion[];
  /** What the running promotions take off the lines they have not priced yet. */
  promotionDiscounts?: Record<string, PromotionDiscount>;
  /** The name of a promotion already applied to a line, when it still exists. */
  promotionName?: (id: string | undefined) => string | undefined;
  discountAmount?: string;
  discountReasonId?: string;
  discountReasons?: AdjustmentReason[];
  serviceCharge?: string;
  tipAmount?: string;
  memberCardUid?: string;
  memberPointsLabel?: string;
  memberCardError?: string | null;
  isMemberCardLoading?: boolean;
  onDiscountAmountChange?: (value: string) => void;
  onDiscountReasonChange?: (value: string) => void;
  onRemoveDiscount?: () => void;
  onTipAmountChange?: (value: string) => void;
  onMemberCardUidChange?: (value: string) => void;
  onLookupMemberCard?: () => void;
  onPaymentAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  isSplitMode?: boolean;
  splitTenderCount?: number;
  splitRemaining?: number;
  isPayView?: boolean;
  requiresTableAssignment?: boolean;
  /** Whether Confirm pay prints the bill; the till ticks it when the guest wants one. */
  printBillOnConfirm?: boolean;
  onPrintBillOnConfirmChange?: (value: boolean) => void;
  onOpenPay?: () => void;
  /** False for staff who take orders but not money, such as waiters. */
  canTakePayment?: boolean;
  onCheckout: () => void;
  onPrintFinance?: () => void;
  onFireKds: () => void;
  onCancelOrder?: () => void;
  onPickup: () => void;
  onTableStatusChange: (status: DiningTableStatus) => void;
  onSessionStateChange: (state: TableSessionState) => void;
  /** Tables pushed together with this one for the same party. */
  joinedTables?: DiningTable[];
  onChangeTable?: () => void;
  onCombineTables?: () => void;
  onReleaseTable?: (tableId: string) => void;
}

export function OrderPanel({
  selectedOrder,
  selectedOrderLines,
  billLines,
  products,
  variantsByProductId,
  paymentMethodId,
  paymentAmount,
  total,
  selectedTable,
  selectedSession,
  isLoading,
  checkoutBlocked = false,
  includeTax = true,
  canCreateOrder = true,
  isDineInService = false,
  feedback,
  errorMessage,
  tableOrderIds = [],
  onCreateOrder,
  onSelectTableOrder,
  onAddTableOrder,
  onManageTableOrders,
  onIncreaseLineQuantity,
  onDecreaseLineQuantity,
  onRemoveLine,
  onToggleFoc,
  promotions = [],
  promotionDiscounts = {},
  promotionName = () => undefined,
  discountAmount = "0.0000",
  discountReasonId = "",
  discountReasons = [],
  serviceCharge = "0.0000",
  tipAmount = "0.0000",
  memberCardUid = "",
  memberPointsLabel,
  memberCardError,
  isMemberCardLoading = false,
  onDiscountAmountChange,
  onDiscountReasonChange,
  onRemoveDiscount,
  onTipAmountChange,
  onMemberCardUidChange,
  onLookupMemberCard,
  isSplitMode = false,
  splitTenderCount = 0,
  splitRemaining = 0,
  isPayView = false,
  requiresTableAssignment = false,
  printBillOnConfirm = false,
  onPrintBillOnConfirmChange,
  onOpenPay,
  canTakePayment = true,
  onCheckout,
  onPrintFinance,
  onFireKds,
  onCancelOrder,
  onPickup,
  onTableStatusChange,
  onSessionStateChange,
  joinedTables = [],
  onChangeTable,
  onCombineTables,
  onReleaseTable,
}: OrderPanelProps) {
  const { t } = useTranslation();
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(false);
  const [tableControlsExpanded, setTableControlsExpanded] = useState(false);
  const [expandedLine, setExpandedLine] = useState<{
    orderId: string | undefined;
    lineId: string;
  } | null>(null);
  const lineDetailsId = useId();
  const tableControlsId = useId();
  const groupedOrderLines = useMemo(
    () => groupOrderLines(selectedOrderLines),
    [selectedOrderLines]
  );
  const variants = Object.values(variantsByProductId).flat();
  const hasActiveOrder = !!selectedOrder || selectedOrderLines.length > 0;
  const isSettledOrder = isSettledSalesOrder(selectedOrder);
  const checkoutReady = isSplitMode
    ? splitTenderCount > 0 && splitRemaining <= 0.009
    : Boolean(paymentMethodId) && Number(paymentAmount) > 0;
  /** The savings the server already credited, so they are inside the total. */
  const promotionDiscount = appliedPromotionDiscount(selectedOrderLines);

  useEffect(() => {
    if (!hasActiveOrder) setConfirmCancelOrder(false);
  }, [hasActiveOrder]);

  useEffect(() => {
    setTableControlsExpanded(false);
  }, [selectedOrder?.id, selectedSession?.id, selectedTable?.id]);

  const resolveLineName = (line: SalesOrderLine) => {
    const variant = variants.find((item) => item.id === line.variantId);
    const product = variant
      ? products.find((item) => item.id === variant.productId)
      : undefined;
    // The name the order was saved with survives a refresh; the loaded menu is
    // only a fallback for lines built in this session, which carry no name yet.
    return (
      lineDisplayName(line) ||
      product?.name ||
      variant?.variantSku ||
      line.variantId.slice(0, 8)
    );
  };

  /** In the expanded details: which variant of the item this line is. */
  const resolveLineVariant = (line: SalesOrderLine) => {
    const variant = variants.find((item) => item.id === line.variantId);
    return variantDisplayName(line) || variantDisplayName(variant ?? {});
  };

  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-3 text-slate-900 min-[1100px]:p-4">
      {tableOrderIds.length && onSelectTableOrder && onAddTableOrder && onManageTableOrders ? (
        <OrderTabs
          orderIds={tableOrderIds}
          activeOrderId={selectedOrder?.id}
          disabled={isLoading}
          onSelect={onSelectTableOrder}
          onAdd={onAddTableOrder}
          onManage={onManageTableOrders}
        />
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {hasActiveOrder ? (
          <>
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {t("cashier.currentOrder")}
                </p>
                <p className="truncate font-semibold">
                  {selectedOrder?.orderNumber ||
                    selectedOrder?.id ||
                    t("cashier.orderPanel.quickCheckout")}
                </p>
                {selectedTable ? (
                  <p className="text-xs text-slate-500">
                    {t("cashier.table")}{" "}
                    {[selectedTable, ...joinedTables]
                      .map((table) => table.tableNumber)
                      .join(" + ")}
                  </p>
                ) : null}
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold">
                {selectedSession?.sessionState || selectedOrder?.status || "CART"}
              </span>
            </div>

            {promotions.length ? (
              <p className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                <span className="font-semibold">
                  {t("cashier.orderPanel.promotionsNow")}
                </span>{" "}
                {promotions
                  .map((promotion) =>
                    promotionSummary(promotion, {
                      freeTime: (buy, free) =>
                        t("cashier.orderPanel.promoFreeTime", { buy, free }),
                      money: formatPosMoney,
                    })
                  )
                  .join(" · ")}
              </p>
            ) : null}

            <div className="my-3 divide-y divide-slate-200 overflow-hidden rounded border border-slate-200">
              {groupedOrderLines.map((line) => {
                const lineName = resolveLineName(line);
                const lineVariant = resolveLineVariant(line);
                const groupLines = line.groupedLines ?? [line];
                const pricedLines = groupLines.map(
                  (entry) =>
                    billLines?.find((priced) => priced.id === entry.id) || entry
                );
                const tax = pricedLines.reduce(
                  (sum, pricedLine) =>
                    sum +
                    (includeTax
                      ? pricedLine.taxInclusive
                        ? 0
                        : Number(pricedLine.taxAmount || 0)
                      : pricedLine.taxInclusive
                        ? -Number(pricedLine.taxAmount || 0)
                        : 0),
                  0
                );
                const lineTotal =
                  pricedLines.reduce(
                    (sum, pricedLine) =>
                      sum +
                      Number(pricedLine.quantity || 0) *
                        Number(pricedLine.unitPrice || 0) -
                      Number(pricedLine.lineDiscount || 0),
                    0
                  ) + tax;
                const quantity = Number(line.quantity || 0);
                const quantityLabel =
                  Number.isFinite(quantity) && quantity % 1 === 0
                    ? String(Math.round(quantity))
                    : String(line.quantity || "0");
                // What the promotions take off this line: what the server already
                // credited it, or what the running rules would take off it.
                const savings = groupLines
                  .map((entry) =>
                    linePromotionSaving(entry, promotionDiscounts)
                  )
                  .filter((entry) => entry !== null);
                const saving = savings.length
                  ? {
                      amount: savings.reduce(
                        (sum, entry) => sum + entry.amount,
                        0
                      ),
                      names: [...new Set(savings.flatMap((entry) => entry.names))],
                    }
                  : null;
                const previewSaving = groupLines
                  .filter((entry) => !entry.appliedPromotionId)
                  .reduce((sum, entry) => {
                    const entrySaving = linePromotionSaving(
                      entry,
                      promotionDiscounts
                    );
                    return sum + (entrySaving?.amount || 0);
                  }, 0);
                const promoLabel =
                  (line.appliedPromotionId
                    ? promotionName(line.appliedPromotionId)
                    : undefined) ||
                  saving?.names.join(", ") ||
                  (saving ? t("cashier.orderPanel.promo") : "");
                // A previewed saving is not on the bill yet, so take it off here.
                const lineDue = lineTotal - previewSaving;
                const isExpanded =
                  expandedLine?.orderId === selectedOrder?.id &&
                  expandedLine?.lineId === line.id;
                const detailsId = `${lineDetailsId}-${line.id}`;
                const isPendingKds = isPendingKdsLine(line);
                return (
                  <div
                    key={line.id}
                    className={isExpanded ? "bg-slate-50" : "bg-white"}
                  >
                    <button
                      type="button"
                      className="flex min-h-11 w-full min-w-0 items-center gap-2 px-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      aria-label={t(
                        isExpanded ? "cashier.orderPanel.collapseItem" : "cashier.orderPanel.expandItem",
                        { name: lineName }
                      )}
                      onClick={() => setExpandedLine(
                        isExpanded ? null : {
                          orderId: selectedOrder?.id,
                          lineId: line.id,
                        }
                      )}
                    >
                      {isPendingKds ? (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-emerald-500 bg-emerald-500"
                          aria-label={t("cashier.orderPanel.kdsPending")}
                          title={t("cashier.orderPanel.kdsPending")}
                        />
                      ) : null}
                      <span
                        className="shrink-0 text-xs font-semibold tabular-nums text-slate-500"
                        aria-label={t("cashier.orderPanel.lineQuantity", { count: quantityLabel })}
                      >
                        {quantityLabel}×
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium">
                        {saving ? (
                          <span
                            className="shrink-0 rounded border border-emerald-600 px-1 text-[10px] font-semibold tracking-wide text-emerald-700"
                            title={promoLabel}
                          >
                            {t("cashier.orderPanel.promo")}
                          </span>
                        ) : null}
                        {isFocLine(line) ? (
                          <span className="shrink-0 rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600">
                            {t("cashier.orderPanel.foc")}
                          </span>
                        ) : null}
                        <span className="min-w-0 truncate" title={lineName}>{lineName}</span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">
                        {formatPosMoney(lineDue)}
                      </span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        fill="none"
                        className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isExpanded ? (
                      <div id={detailsId} className="border-t border-slate-200 px-2 pb-2 pt-1.5">
                        <p className="break-words text-sm font-medium">{lineName}</p>
                        {lineVariant && lineVariant !== lineName ? (
                          <p className="mt-0.5 break-words text-xs text-slate-500">
                            {lineVariant}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs tabular-nums text-slate-600">
                          <span className={saving ? "text-slate-400 line-through" : ""}>
                            {formatPosMoney(line.unitPrice)}
                          </span>
                          {saving && promoLabel ? ` · ${promoLabel}` : ""}
                        </p>
                        {saving ? (
                          <p className="mt-0.5 text-xs font-medium text-emerald-700">
                            {t("cashier.orderPanel.promoSaving", {
                              name: promoLabel,
                              amount: formatPosMoney(saving.amount),
                            })}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <button
                            type="button"
                            className="min-h-11 min-w-11 rounded border border-slate-300 px-2 font-semibold leading-none hover:bg-slate-100 focus-visible:outline-blue-500 disabled:opacity-50"
                            aria-label={t("cashier.orderPanel.decreaseQuantity")}
                            onClick={() => onDecreaseLineQuantity(line)}
                            disabled={isLoading || isSettledOrder}
                          >
                            -
                          </button>
                          <span
                            className="min-w-[2ch] text-center font-medium tabular-nums"
                            aria-label={t("cashier.orderPanel.lineQuantity", {
                              count: quantityLabel,
                            })}
                          >
                            {quantityLabel}
                          </span>
                          <button
                            type="button"
                            className="min-h-11 min-w-11 rounded border border-slate-300 px-2 font-semibold leading-none hover:bg-slate-100 focus-visible:outline-blue-500 disabled:opacity-50"
                            aria-label={t("cashier.orderPanel.increaseQuantity")}
                            onClick={() => onIncreaseLineQuantity(line)}
                            disabled={isLoading || isSettledOrder}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="min-h-11 rounded border border-slate-300 px-2 py-1 font-medium hover:bg-slate-100 focus-visible:outline-blue-500 disabled:opacity-50"
                            onClick={() => onToggleFoc?.(line)}
                            disabled={isLoading || isSettledOrder || !onToggleFoc}
                          >
                            {isFocLine(line)
                              ? t("cashier.orderPanel.undoFoc")
                              : t("cashier.orderPanel.foc")}
                          </button>
                          <button
                            type="button"
                            className="min-h-11 rounded border border-red-300 px-2 py-1 font-medium text-red-700 hover:bg-red-50 focus-visible:outline-blue-500 disabled:opacity-50"
                            onClick={() => onRemoveLine(line)}
                            disabled={isLoading || isSettledOrder}
                          >
                            {t("cashier.orderPanel.remove")}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {selectedOrderLines.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-20 w-20 rounded-full bg-slate-100" />
                  <p className="mt-3 text-sm text-slate-400">
                    {t("cashier.orderPanel.emptyLines")}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center text-center">
            <div>
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100" />
              <p className="mt-3 text-sm text-slate-400">
                {t("cashier.orderPanel.noOrder")}
              </p>
            </div>
          </div>
        )}
      </div>

      {hasActiveOrder ? (
        <div className="max-h-[48%] shrink-0 space-y-2 overflow-y-auto border-t border-slate-200 pt-3">
          {promotionDiscount > 0 ? (
            <p className="flex items-center justify-between text-sm text-emerald-700">
              <span>{t("cashier.orderPanel.promotionDiscount")}</span>
              <span className="tabular-nums">−{formatPosMoney(promotionDiscount)}</span>
            </p>
          ) : null}
          <div className="flex items-center justify-between font-semibold">
            <span>{t("cashier.total")}</span>
            <span className="tabular-nums">{formatPosMoney(total)}</span>
          </div>
          {onDiscountAmountChange && onTipAmountChange ? (
            <OrderAdjustments
              discountAmount={discountAmount}
              discountReasonId={discountReasonId}
              discountReasons={discountReasons}
              serviceCharge={serviceCharge}
              tipAmount={tipAmount}
              memberCardUid={memberCardUid}
              memberPointsLabel={memberPointsLabel}
              memberCardError={memberCardError}
              isMemberCardLoading={isMemberCardLoading}
              disabled={isLoading || isSettledOrder}
              onDiscountAmountChange={onDiscountAmountChange}
              onDiscountReasonChange={onDiscountReasonChange || (() => undefined)}
              onRemoveDiscount={onRemoveDiscount || (() => undefined)}
              onTipAmountChange={onTipAmountChange}
              onMemberCardUidChange={onMemberCardUidChange || (() => undefined)}
              onLookupMemberCard={onLookupMemberCard || (() => undefined)}
            />
          ) : null}
          {isSplitMode || isPayView ? (
            <p className="text-xs text-slate-500">
              {isSplitMode
                ? splitTenderCount > 0 && splitRemaining <= 0.009
                  ? t("cashier.payment.splitCovered")
                  : t("cashier.payment.splitTenderCount", {
                      count: splitTenderCount,
                    })
                : t("cashier.payment.chooseMethod")}
            </p>
          ) : null}
          {selectedTable || selectedSession ? (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                aria-expanded={tableControlsExpanded}
                aria-controls={tableControlsId}
                aria-label={t(
                  tableControlsExpanded
                    ? "cashier.orderPanel.collapseTableControls"
                    : "cashier.orderPanel.expandTableControls"
                )}
                onClick={() => setTableControlsExpanded((expanded) => !expanded)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {t("cashier.orderPanel.tableControls")}
                  </span>
                  <span className="block truncate text-xs font-medium text-slate-800">
                    {[
                      selectedTable
                        ? selectedTable.tableNumber ||
                          t(`cashier.orderPanel.tableStatuses.${selectedTable.status}`)
                        : null,
                      selectedSession
                        ? t(`cashier.orderPanel.sessionStates.${selectedSession.sessionState}`)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 motion-reduce:transition-none ${tableControlsExpanded ? "rotate-180" : ""}`}
                >
                  <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {tableControlsExpanded ? (
                <div id={tableControlsId} className="space-y-2 border-t border-slate-200 bg-slate-50 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTable ? (
                      <label
                        className={[
                          "min-w-0 space-y-1",
                          selectedSession ? "" : "col-span-2",
                        ].join(" ")}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {t("cashier.orderPanel.tableStatusLabel")}
                        </span>
                        <select
                          aria-label={t("cashier.orderPanel.tableStatus")}
                          value={selectedTable.status}
                          onChange={(event) =>
                            onTableStatusChange(event.target.value as DiningTableStatus)
                          }
                          className="min-h-11 w-full min-w-0 rounded border border-slate-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {(["AVAILABLE", "OCCUPIED", "DIRTY", "RESERVED"] as const).map(
                            (status) => (
                              <option key={status} value={status}>
                                {t(`cashier.orderPanel.tableStatuses.${status}`)}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    ) : null}
                    {selectedSession ? (
                      <label
                        className={[
                          "min-w-0 space-y-1",
                          selectedTable ? "" : "col-span-2",
                        ].join(" ")}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {t("cashier.orderPanel.sessionStateLabel")}
                        </span>
                        <select
                          aria-label={t("cashier.orderPanel.sessionState")}
                          value={selectedSession.sessionState}
                          onChange={(event) =>
                            onSessionStateChange(event.target.value as TableSessionState)
                          }
                          className="min-h-11 w-full min-w-0 rounded border border-slate-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {(
                            [
                              "SEATED",
                              "ORDERING",
                              "SERVED",
                              "PAYMENT_PENDING",
                              "CLOSED",
                            ] as const
                          ).map((state) => (
                            <option key={state} value={state}>
                              {t(`cashier.orderPanel.sessionStates.${state}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>

                  {selectedSession && onChangeTable && onCombineTables ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={onChangeTable}
                          className="min-h-11 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 transition-colors hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("cashier.seating.changeTable")}
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={onCombineTables}
                          className="min-h-11 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 transition-colors hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("cashier.seating.combine")}
                        </button>
                      </div>
                      {joinedTables.length && onReleaseTable ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-500">
                            {t("cashier.seating.joinedTables")}:
                          </span>
                          {joinedTables.map((table) => (
                            <button
                              key={table.id}
                              type="button"
                              disabled={isLoading}
                              onClick={() => onReleaseTable(table.id)}
                              title={t("cashier.seating.release", {
                                table: table.tableNumber,
                              })}
                              aria-label={t("cashier.seating.release", {
                                table: table.tableNumber,
                              })}
                              className="min-h-11 rounded-full border border-slate-300 bg-white px-3 font-semibold text-slate-700 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {table.tableNumber} ×
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              disabled={
                !selectedOrderLines.length ||
                isLoading ||
                isSettledOrder ||
                requiresTableAssignment
              }
              title={
                requiresTableAssignment
                  ? t("cashier.orderPanel.assignTableToContinue")
                  : undefined
              }
              onClick={onFireKds}
            >
              {t("cashier.orderPanel.sendKds")}
            </Button>
            {selectedOrder?.serviceType === "PICK_UP" ? (
              <Button
                variant="secondary"
                disabled={isLoading}
                onClick={onPickup}
              >
                {t("cashier.orderPanel.pickedUp")}
              </Button>
            ) : (
              <span />
            )}
          </div>
          {isPayView && canTakePayment ? (
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={printBillOnConfirm}
                disabled={isLoading}
                onChange={(event) =>
                  onPrintBillOnConfirmChange?.(event.target.checked)
                }
              />
              {t("cashier.payment.printBillOnConfirm")}
            </label>
          ) : null}
          {!canTakePayment ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-xs text-slate-600">
              {t("cashier.orderPanel.paymentAtCashier")}
            </p>
          ) : (
          <Button
            fullWidth
            disabled={
              isSettledOrder ||
              checkoutBlocked ||
              !selectedOrderLines.length ||
              isLoading ||
              requiresTableAssignment ||
              (isPayView && !checkoutReady)
            }
            title={
              requiresTableAssignment
                ? t("cashier.orderPanel.assignTableToContinue")
                : undefined
            }
            isLoading={isLoading}
            onClick={() => {
              if (!isPayView && onOpenPay) {
                onOpenPay();
                return;
              }
              onCheckout();
            }}
          >
            {isPayView ? t("cashier.confirmPay") : t("cashier.payNow")}
          </Button>
          )}
          {isPayView && onPrintFinance ? (
            <Button
              fullWidth
              className="!border-emerald-600 !bg-emerald-600 !text-white hover:!border-emerald-700 hover:!bg-emerald-700"
              disabled={isLoading || checkoutBlocked}
              onClick={onPrintFinance}
            >
              {t("cashier.printFinance")}
            </Button>
          ) : null}
          {onCancelOrder ? (
            confirmCancelOrder ? (
              <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
                <p className="text-xs text-rose-900">
                  {selectedTable
                    ? t("cashier.orderPanel.cancelOrderConfirmTable")
                    : t("cashier.orderPanel.cancelOrderConfirm")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isLoading}
                    onClick={() => setConfirmCancelOrder(false)}
                  >
                    {t("cashier.orderPanel.keepOrder")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isLoading}
                    isLoading={isLoading}
                    onClick={() => {
                      setConfirmCancelOrder(false);
                      onCancelOrder();
                    }}
                  >
                    {t("cashier.orderPanel.confirmCancelOrder")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                fullWidth
                variant="destructive"
                disabled={
                  isLoading ||
                  selectedOrder?.status === "CANCELLED" ||
                  selectedOrder?.status === "VOIDED"
                }
                onClick={() => setConfirmCancelOrder(true)}
              >
                {t("cashier.orderPanel.cancelOrder")}
              </Button>
            )
          ) : null}
        </div>
      ) : (
        <Button
          fullWidth
          isLoading={isLoading}
          disabled={!canCreateOrder || isLoading}
          onClick={onCreateOrder}
        >
          {isDineInService
            ? t("cashier.orderPanel.newDineInOrder")
            : t("cashier.newOrder")}
        </Button>
      )}

      {feedback || errorMessage ? (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3" aria-live="polite">
          {feedback ? (
            <p
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
            >
              {feedback}
            </p>
          ) : null}
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
