import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import {
  DiningTableStatus,
  TableSessionState,
} from "@/core/application/dtos/CashierDTO";
import {
  DiningTable,
  PaymentMethod,
  Product,
  ProductVariant,
  SalesOrder,
  SalesOrderLine,
  TableSession,
} from "@/core/domain/entities/Cashier";

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
  feedback?: string | null;
  errorMessage?: string | null;
  onCreateOrder: () => void;
  onIncreaseLineQuantity: (line: SalesOrderLine) => void;
  onDecreaseLineQuantity: (line: SalesOrderLine) => void;
  onRemoveLine: (line: SalesOrderLine) => void;
  onPaymentAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onCheckout: () => void;
  onFireKds: () => void;
  onPickup: () => void;
  onTableStatusChange: (status: DiningTableStatus) => void;
  onSessionStateChange: (state: TableSessionState) => void;
}

export function OrderPanel({
  selectedOrder,
  selectedOrderLines,
  products,
  variantsByProductId,
  paymentMethods,
  paymentMethodId,
  paymentAmount,
  total,
  selectedTable,
  selectedSession,
  paymentInputRef,
  isLoading,
  canCreateOrder = true,
  feedback,
  errorMessage,
  onCreateOrder,
  onIncreaseLineQuantity,
  onDecreaseLineQuantity,
  onRemoveLine,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onCheckout,
  onFireKds,
  onPickup,
  onTableStatusChange,
  onSessionStateChange,
}: OrderPanelProps) {
  const { t } = useTranslation();
  const variants = Object.values(variantsByProductId).flat();
  const hasActiveOrder = !!selectedOrder || selectedOrderLines.length > 0;

  const resolveLineName = (line: SalesOrderLine) => {
    const variant = variants.find((item) => item.id === line.variantId);
    const product = variant
      ? products.find((item) => item.id === variant.productId)
      : undefined;
    return product?.name || variant?.variantSku || line.variantId.slice(0, 8);
  };

  return (
    <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white p-3 text-slate-900 min-[1100px]:p-4">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {hasActiveOrder ? (
          <>
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {t("cashier.currentOrder")}
                </p>
                <p className="truncate font-semibold">
                  {selectedOrder?.orderNumber || selectedOrder?.id || "Quick Checkout"}
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
                  Number(line.lineDiscount || 0);
                return (
                  <div
                    key={line.id}
                    className="rounded border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-medium">
                        {resolveLineName(line)}
                      </span>
                      <span className="shrink-0">{lineTotal.toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {Number(line.quantity)} × {line.unitPrice}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        onClick={() => onDecreaseLineQuantity(line)}
                        disabled={isLoading}
                      >
                        {t("cashier.orderPanel.decrease")}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        onClick={() => onIncreaseLineQuantity(line)}
                        disabled={isLoading}
                      >
                        {t("cashier.orderPanel.increase")}
                      </button>
                      <button
                        type="button"
                        className="ml-auto rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                        onClick={() => onRemoveLine(line)}
                        disabled={isLoading}
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
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between font-semibold">
            <span>{t("cashier.total")}</span>
            <span>{total}</span>
          </div>
          <input
            ref={paymentInputRef}
            inputMode="decimal"
            value={paymentAmount}
            onChange={(event) => onPaymentAmountChange(event.target.value)}
            aria-label={t("cashier.orderPanel.paymentAmount")}
            className="min-h-10 w-full rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
          />
          <select
            value={paymentMethodId}
            onChange={(event) => onPaymentMethodChange(event.target.value)}
            aria-label={t("cashier.orderPanel.paymentMethod")}
            className="min-h-10 w-full rounded border border-slate-300 px-3 text-sm"
          >
            <option value="">{t("cashier.orderPanel.selectPayment")}</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
          {selectedTable ? (
            <select
              aria-label="Table status"
              value={selectedTable.status}
              onChange={(event) =>
                onTableStatusChange(event.target.value as DiningTableStatus)
              }
              className="min-h-10 w-full rounded border border-slate-300 px-3 text-sm"
            >
              {(["AVAILABLE", "OCCUPIED", "DIRTY", "RESERVED"] as const).map(
                (status) => (
                  <option key={status} value={status}>
                    Table: {status}
                  </option>
                )
              )}
            </select>
          ) : null}
          {selectedSession ? (
            <select
              aria-label="Table session state"
              value={selectedSession.sessionState}
              onChange={(event) =>
                onSessionStateChange(event.target.value as TableSessionState)
              }
              className="min-h-10 w-full rounded border border-slate-300 px-3 text-sm"
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
                  Session: {state}
                </option>
              ))}
            </select>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              disabled={!selectedOrderLines.length || isLoading}
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
              !selectedOrderLines.length ||
              !paymentMethodId ||
              Number(paymentAmount) <= 0
            }
            isLoading={isLoading}
            onClick={onCheckout}
          >
            {t("cashier.payNow")}
          </Button>
          {feedback ? (
            <p className="rounded bg-green-50 p-2 text-xs text-green-700">
              {feedback}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="rounded bg-red-50 p-2 text-xs text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : (
        <Button
          fullWidth
          isLoading={isLoading}
          disabled={!canCreateOrder || isLoading}
          onClick={onCreateOrder}
        >
          {t("cashier.newOrder")}
        </Button>
      )}
    </aside>
  );
}
