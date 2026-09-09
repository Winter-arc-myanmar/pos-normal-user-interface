import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { SplitPaymentTenderDTO } from "@/core/application/dtos/CashierDTO";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import { isMemberCardPaymentMethod } from "@/lib/pos/paymentMethods";
import { remainingReceivable } from "@/lib/pos/splitPayments";

interface PaymentViewProps {
  methods: PaymentMethod[];
  selectedMethodId: string;
  paymentAmount: string;
  total: string;
  subtotal?: string;
  isSplitMode: boolean;
  splitTenders: SplitPaymentTenderDTO[];
  isLoading?: boolean;
  onSelectMethod: (methodId: string) => void;
  onPaymentAmountChange: (value: string) => void;
  onOpenSplit: () => void;
  onCloseSplit: () => void;
  onAddTender: () => void;
  onRemoveTender: (tenderId: string) => void;
}

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#087cf0" />
      <circle cx="12" cy="12" r="2.5" fill="#fff" />
      <path d="M7 10h1.5M15.5 14H17" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

function MemberCardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="#111827" />
      <rect x="2" y="8" width="20" height="3" fill="#374151" />
      <rect x="5" y="14" width="7" height="2" rx="0.5" fill="#e5e7eb" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" fill="#f59e0b" />
      <path d="M14 12h7v5H14a2.5 2.5 0 0 1 0-5Z" fill="#fb923c" />
      <circle cx="16.5" cy="14.5" r="1" fill="#fff" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M12 3v18M8 8H5a2 2 0 0 0-2 2v8M16 8h3a2 2 0 0 1 2 2v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      <circle cx="16" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

function CloseSplitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M7 7l10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatMoney(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

function methodLabel(method: PaymentMethod, memberCardLabel: string): string {
  if (isMemberCardPaymentMethod(method)) return memberCardLabel;
  return method.name.toUpperCase();
}

function methodRank(method: PaymentMethod): number {
  if (/cash/i.test(method.name) || /cash/i.test(method.code || "")) return 0;
  if (isMemberCardPaymentMethod(method)) return 1;
  return 2;
}

export function PaymentView({
  methods,
  selectedMethodId,
  paymentAmount,
  total,
  subtotal,
  isSplitMode,
  splitTenders,
  isLoading,
  onSelectMethod,
  onPaymentAmountChange,
  onOpenSplit,
  onCloseSplit,
  onAddTender,
  onRemoveTender,
}: PaymentViewProps) {
  const { t } = useTranslation();
  const [confirmClose, setConfirmClose] = useState(false);
  const splitAmountRef = useRef<HTMLInputElement>(null);
  const remaining = remainingReceivable(total, isSplitMode ? splitTenders : []);
  const displayRemaining = isSplitMode ? remaining : Number(total || 0);
  const splitCovered =
    isSplitMode && splitTenders.length > 0 && remaining <= 0.009;
  const billSubtotal = Number(subtotal || total || 0);
  const billTotal = Number(total || 0);
  const memberCardLabel = t("cashier.payment.memberCard");
  const sortedMethods = useMemo(
    () => [...methods].sort((a, b) => methodRank(a) - methodRank(b)),
    [methods]
  );
  const selectedMethod = sortedMethods.find((method) => method.id === selectedMethodId);
  const requestCloseSplit = useCallback(() => {
    if (splitTenders.length) {
      setConfirmClose(true);
      return;
    }
    onCloseSplit();
  }, [onCloseSplit, splitTenders.length]);

  useEffect(() => {
    if (!isSplitMode) setConfirmClose(false);
  }, [isSplitMode]);

  useEffect(() => {
    if (!isSplitMode || confirmClose) return;
    splitAmountRef.current?.focus();
    splitAmountRef.current?.select();
  }, [confirmClose, isSplitMode, selectedMethodId]);

  useEffect(() => {
    if (!isSplitMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (confirmClose) {
        setConfirmClose(false);
        return;
      }
      requestCloseSplit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmClose, isSplitMode, requestCloseSplit]);

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(11rem,16rem)_4.5rem_minmax(0,1fr)] overflow-hidden bg-[#202020] text-white">
      <aside className="flex min-h-0 flex-col border-r border-white/10 p-2">
        <div className="rounded bg-white p-3 text-slate-900">
          <p className="text-sm font-semibold">{t("cashier.payment.bill")}</p>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-slate-500">{t("cashier.payment.subtotal")}</span>
            <span>{formatMoney(billSubtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm font-semibold">
            <span>{t("cashier.total")}</span>
            <span>{formatMoney(billTotal)}</span>
          </div>
        </div>

        {isSplitMode ? (
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded border border-blue-500/40 bg-black/25 p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                  {t("cashier.payment.splitOn")}
                </p>
                {splitTenders.length ? (
                  <p className="text-[10px] text-slate-400">
                    {t("cashier.payment.splitTenderCount", {
                      count: splitTenders.length,
                    })}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={requestCloseSplit}
                aria-label={t("cashier.payment.closeSplitTitle")}
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <CloseSplitIcon />
              </button>
            </div>
            {confirmClose ? (
              <div className="space-y-2 rounded border border-amber-400/40 bg-amber-950/50 p-2">
                <p className="text-xs text-amber-100">
                  {t("cashier.payment.closeSplitConfirm", {
                    count: splitTenders.length,
                  })}
                </p>
                <Button
                  size="sm"
                  fullWidth
                  variant="secondary"
                  onClick={() => setConfirmClose(false)}
                >
                  {t("cashier.payment.keepSplit")}
                </Button>
                <Button size="sm" fullWidth onClick={onCloseSplit}>
                  {t("cashier.payment.confirmCloseSplit")}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("cashier.payment.nextMethod")}
                </p>
                <p className="rounded bg-white/10 px-2 py-1.5 text-xs font-semibold">
                  {selectedMethod
                    ? methodLabel(selectedMethod, memberCardLabel)
                    : t("cashier.orderPanel.selectPayment")}
                </p>
                <input
                  ref={splitAmountRef}
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(event) => onPaymentAmountChange(event.target.value)}
                  aria-label={t("cashier.payment.splitAmount")}
                  className="min-h-9 w-full rounded border border-slate-600 bg-slate-800 px-2 text-sm"
                />
                <Button
                  size="sm"
                  fullWidth
                  disabled={
                    !selectedMethodId ||
                    Number(paymentAmount) <= 0 ||
                    isLoading ||
                    remaining <= 0.009
                  }
                  onClick={onAddTender}
                >
                  {t("cashier.payment.addTender")}
                </Button>
              </>
            )}
            {splitTenders.map((tender) => {
              const method = methods.find((item) => item.id === tender.paymentMethodId);
              return (
                <div
                  key={tender.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded bg-white/5 px-2 py-1.5 text-xs"
                >
                  <span className="truncate">
                    {method ? methodLabel(method, memberCardLabel) : tender.paymentMethodId}
                  </span>
                  <span className="tabular-nums text-slate-200">
                    {formatMoney(Number(tender.amount))}
                  </span>
                  <button
                    type="button"
                    className="text-red-300 hover:text-red-200"
                    onClick={() => onRemoveTender(tender.id)}
                  >
                    {t("cashier.orderPanel.remove")}
                  </button>
                </div>
              );
            })}
            {!splitTenders.length && !confirmClose ? (
              <p className="text-xs text-slate-400">{t("cashier.payment.splitHint")}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">{t("cashier.payment.splitRailHint")}</p>
        )}
      </aside>

      <div className="flex min-h-0 flex-col items-center gap-1 overflow-y-auto border-r border-white/10 bg-[#171717] p-1">
        <button
          type="button"
          onClick={() => {
            if (!isSplitMode) onOpenSplit();
          }}
          aria-pressed={isSplitMode}
          aria-label={t("cashier.payment.split")}
          className={[
            "flex min-h-20 w-full flex-col items-center justify-center rounded px-1 py-2 text-[11px] font-semibold",
            isSplitMode
              ? "cursor-default bg-blue-700 text-white ring-2 ring-blue-300"
              : "bg-blue-600 text-white hover:bg-blue-500",
          ].join(" ")}
        >
          <SplitIcon />
          <span className="mt-1">{t("cashier.payment.split")}</span>
        </button>
        {isSplitMode ? (
          <button
            type="button"
            onClick={requestCloseSplit}
            className="flex min-h-16 w-full flex-col items-center justify-center rounded bg-slate-700 px-1 py-2 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            <CloseSplitIcon />
            <span className="mt-1">{t("cashier.payment.closeSplit")}</span>
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-col p-2">
        <div
          className={[
            "flex min-h-12 items-center rounded px-3 text-sm font-semibold",
            splitCovered ? "bg-emerald-600" : "bg-blue-600",
          ].join(" ")}
        >
          {splitCovered
            ? t("cashier.payment.splitCovered")
            : t("cashier.payment.remaining", {
                amount: formatMoney(displayRemaining),
              })}
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          {t("cashier.payment.chooseMethod")}
        </p>
        <div className="mt-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto">
          {sortedMethods.map((method) => {
            const selected = selectedMethodId === method.id;
            const memberCard = isMemberCardPaymentMethod(method);
            const cash =
              /cash/i.test(method.name) || /cash/i.test(method.code || "");
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => onSelectMethod(method.id)}
                className={[
                  "flex min-h-[6.5rem] flex-col items-center justify-center rounded border bg-white px-2 text-slate-900 transition",
                  selected
                    ? "border-blue-500 ring-2 ring-blue-400"
                    : "border-slate-200 hover:border-blue-300",
                ].join(" ")}
              >
                {memberCard ? <MemberCardIcon /> : cash ? <CashIcon /> : <WalletIcon />}
                <span className="mt-1 text-center text-[11px] font-bold leading-tight">
                  {methodLabel(method, memberCardLabel)}
                </span>
                {method.isLocalFallback ? (
                  <span className="mt-0.5 text-[9px] uppercase text-amber-600">
                    {t("cashier.payment.localFallback")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
