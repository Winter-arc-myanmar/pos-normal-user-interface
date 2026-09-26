import { useEffect, useState, type RefObject } from "react";
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
import { isFocLine } from "@/lib/pos/checkoutAdjustments";

interface OrderPanelProps {
  selectedOrder: SalesOrder | null;
  selectedOrderLines: SalesOrderLine[];
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
  onServiceChargeChange?: (value: string) => void;
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
  onOpenPay?: () => void;
  onCheckout: () => void;
  onPrintFinance?: () => void;
  onFireKds: () => void;
  onCancelOrder?: () => void;
  onPickup: () => void;
  onTableStatusChange: (status: DiningTableStatus) => void;
  onSessionStateChange: (state: TableSessionState) => void;
}

export function OrderPanel({
  selectedOrder,
  selectedOrderLines,
  products,
  variantsByProductId,
  paymentMethodId,
  paymentAmount,
  total,
  selectedTable,
  selectedSession,
  isLoading,
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
  onServiceChargeChange,
  onTipAmountChange,
  onMemberCardUidChange,
  onLookupMemberCard,
  isSplitMode = false,
  splitTenderCount = 0,
  splitRemaining = 0,
  isPayView = false,
  requiresTableAssignment = false,
  onOpenPay,
  onCheckout,
  onPrintFinance,
  onFireKds,
  onCancelOrder,
  onPickup,
  onTableStatusChange,
  onSessionStateChange,
}: OrderPanelProps) {
  const { t } = useTranslation();
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(false);
  const variants = Object.values(variantsByProductId).flat();
  const hasActiveOrder = !!selectedOrder || selectedOrderLines.length > 0;
  const isSettledOrder = isSettledSalesOrder(selectedOrder);
  const checkoutReady = isSplitMode
    ? splitTenderCount > 0 && splitRemaining <= 0.009
    : Boolean(paymentMethodId) && Number(paymentAmount) > 0;

  useEffect(() => {
    if (!hasActiveOrder) setConfirmCancelOrder(false);
  }, [hasActiveOrder]);

  const resolveLineName = (line: SalesOrderLine) => {
    const variant = variants.find((item) => item.id === line.variantId);
    const product = variant
      ? products.find((item) => item.id === variant.productId)
      : undefined;
    return product?.name || variant?.variantSku || line.variantId.slice(0, 8);
  };

  return (
    <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white p-3 text-slate-900 min-[1100px]:p-4">
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
                    {t("cashier.table")} {selectedTable.tableNumber}
                  </p>
                ) : null}
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold">
                {selectedSession?.sessionState || selectedOrder?.status || "CART"}
              </span>
            </div>

            <div className="space-y-2 py-3">
              {selectedOrderLines.map((line) => {
                const lineTotal =
                  Number(line.quantity || 0) * Number(line.unitPrice || 0) -
                  Number(line.lineDiscount || 0) +
                  Number(line.taxAmount || 0);
                const quantity = Number(line.quantity || 0);
                const quantityLabel =
                  Number.isFinite(quantity) && quantity % 1 === 0
                    ? String(Math.round(quantity))
                    : String(line.quantity || "0");
                return (
                  <div
                    key={line.id}
                    className="rounded border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">
                        {resolveLineName(line)}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">
                        {lineTotal.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs tabular-nums text-slate-600">
                      {line.unitPrice ?? "0.0000"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <button
                        type="button"
                        className="min-h-7 min-w-7 rounded border border-slate-300 px-2 font-semibold leading-none"
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
                        className="min-h-7 min-w-7 rounded border border-slate-300 px-2 font-semibold leading-none"
                        aria-label={t("cashier.orderPanel.increaseQuantity")}
                        onClick={() => onIncreaseLineQuantity(line)}
                        disabled={isLoading || isSettledOrder}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 font-medium"
                        onClick={() => onToggleFoc?.(line)}
                        disabled={isLoading || isSettledOrder || !onToggleFoc}
                      >
                        {isFocLine(line)
                          ? t("cashier.orderPanel.undoFoc")
                          : t("cashier.orderPanel.foc")}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 font-medium text-red-700"
                        onClick={() => onRemoveLine(line)}
                        disabled={isLoading || isSettledOrder}
                      >
                        {t("cashier.orderPanel.remove")}
                      </button>
                    </div>
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
        <div className="max-h-[48vh] shrink-0 space-y-2 overflow-y-auto border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between font-semibold">
            <span>{t("cashier.total")}</span>
            <span>{total}</span>
          </div>
          {onDiscountAmountChange && onTipAmountChange && onServiceChargeChange ? (
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
              onServiceChargeChange={onServiceChargeChange}
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
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
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
                    className="min-h-9 w-full min-w-0 rounded border border-slate-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none"
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
                    className="min-h-9 w-full min-w-0 rounded border border-slate-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none"
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
          <Button
            fullWidth
            disabled={
              isSettledOrder ||
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
          {isPayView && onPrintFinance ? (
            <Button fullWidth variant="outline" onClick={onPrintFinance}>
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
