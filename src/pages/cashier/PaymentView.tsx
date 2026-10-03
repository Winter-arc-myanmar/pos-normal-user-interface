import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { CardCaptureStatus } from "@/components/ui/CardCaptureStatus";
import { SplitPaymentTenderDTO } from "@/core/application/dtos/CashierDTO";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import { isMemberCardPaymentMethod } from "@/lib/pos/paymentMethods";
import { remainingReceivable } from "@/lib/pos/splitPayments";

interface MemberCardLookupProps {
  cardUid: string;
  guestName?: string;
  walletNumber?: string;
  balance?: string;
  status?: string;
  error?: string | null;
  isLoading?: boolean;
  nfcSupported: boolean;
  nfcActive: boolean;
  nfcError: string | null;
  lastUid?: string;
  onEnableNfc: () => void;
  onCardUidChange: (value: string) => void;
  onDetect: () => void;
}

interface PaymentViewProps {
  methods: PaymentMethod[];
  selectedMethodId: string;
  paymentAmount: string;
  total: string;
  subtotal?: string;
  isSplitMode: boolean;
  splitTenders: SplitPaymentTenderDTO[];
  isLoading?: boolean;
  memberCardLookup?: MemberCardLookupProps;
  onSelectMethod: (methodId: string) => void;
  onPaymentAmountChange: (value: string) => void;
  onOpenSplit: () => void;
  onClosePay: () => void;
  onAddTender: () => void;
  onRemoveTender: (tenderId: string) => void;
}

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#1a9bff" />
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

/** Overlay the card lookup on phones and any portrait POS, not just <768px. */
const CARD_LOOKUP_SHEET_MQ = "(max-width: 1023px), (orientation: portrait)";

function methodLabel(method: PaymentMethod, memberCardLabel: string): string {
  if (isMemberCardPaymentMethod(method)) return memberCardLabel;
  return method.name.toUpperCase();
}

function methodRank(method: PaymentMethod): number {
  const kind = String(method.kind || method.code || "").toUpperCase();
  if (kind === "CASH" || /cash/i.test(method.name)) return 0;
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
  memberCardLookup,
  onSelectMethod,
  onPaymentAmountChange,
  onOpenSplit,
  onClosePay,
  onAddTender,
  onRemoveTender,
}: PaymentViewProps) {
  const { t } = useTranslation();
  const [confirmClose, setConfirmClose] = useState(false);
  const [cardLookupOpen, setCardLookupOpen] = useState(true);
  const remaining = remainingReceivable(total, isSplitMode ? splitTenders : []);
  const displayRemaining = isSplitMode ? remaining : Number(total || 0);
  const splitCovered =
    isSplitMode && splitTenders.length > 0 && remaining <= 0.009;
  const billSubtotal = Number(subtotal || total || 0);
  const billTotal = Number(total || 0);
  const memberCardLabel = t("cashier.payment.memberCard");
  const selectedMethod = methods.find((method) => method.id === selectedMethodId);
  const showMemberCardLookup =
    Boolean(memberCardLookup) &&
    Boolean(selectedMethod && isMemberCardPaymentMethod(selectedMethod));
  const sortedMethods = useMemo(
    () => [...methods].sort((a, b) => methodRank(a) - methodRank(b)),
    [methods]
  );
  const requestClosePay = useCallback(() => {
    if (isSplitMode && splitTenders.length) {
      setConfirmClose(true);
      return;
    }
    onClosePay();
  }, [isSplitMode, onClosePay, splitTenders.length]);

  useEffect(() => {
    if (!isSplitMode) setConfirmClose(false);
  }, [isSplitMode]);

  useEffect(() => {
    if (showMemberCardLookup) setCardLookupOpen(true);
  }, [showMemberCardLookup]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (confirmClose) {
        setConfirmClose(false);
        return;
      }
      if (
        showMemberCardLookup &&
        cardLookupOpen &&
        window.matchMedia(CARD_LOOKUP_SHEET_MQ).matches
      ) {
        setCardLookupOpen(false);
        return;
      }
      requestClosePay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cardLookupOpen, confirmClose, requestClosePay, showMemberCardLookup]);

  return (
    <section className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)_auto_auto] overflow-hidden bg-[#202020] text-white md:grid-cols-[minmax(11rem,16rem)_4.5rem_minmax(0,1fr)] md:grid-rows-none">
      <aside className="order-3 flex min-h-0 max-h-[38vh] flex-col overflow-y-auto border-t border-white/10 p-2 md:order-none md:max-h-none md:border-r md:border-t-0">
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
                <Button size="sm" fullWidth onClick={onClosePay}>
                  {t("cashier.payment.confirmCloseSplit")}
                </Button>
              </div>
            ) : (
              <>
                <input
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
                    {tender.guestCardId ? ` · ${tender.guestCardId}` : ""}
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

      <div className="order-2 flex min-h-0 flex-row items-stretch gap-1 overflow-x-auto border-t border-white/10 bg-[#171717] p-1 md:order-none md:flex-col md:overflow-y-auto md:border-r md:border-t-0">
        <button
          type="button"
          onClick={() => {
            if (!isSplitMode) onOpenSplit();
          }}
          aria-pressed={isSplitMode}
          aria-label={t("cashier.payment.split")}
          className={[
            "flex min-h-12 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded px-2 py-2 text-[11px] font-semibold md:min-h-20 md:w-full md:flex-none md:flex-col md:gap-0",
            isSplitMode
              ? "cursor-default bg-blue-700 text-white ring-2 ring-blue-300"
              : "bg-blue-600 text-white hover:bg-blue-500",
          ].join(" ")}
        >
          <SplitIcon />
          <span className="md:mt-1">{t("cashier.payment.split")}</span>
        </button>
        <button
          type="button"
          onClick={requestClosePay}
          aria-label={t("cashier.payment.closePayTitle")}
          className="flex min-h-12 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded bg-slate-800 px-2 py-2 text-[11px] font-semibold text-white hover:bg-slate-600 md:min-h-16 md:w-full md:flex-none md:flex-col md:gap-0"
        >
          <CloseSplitIcon />
          <span className="md:mt-1">{t("cashier.payment.closePay")}</span>
        </button>
      </div>

      <div className="order-1 flex min-h-0 flex-col p-2 md:order-none">
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
        {showMemberCardLookup && memberCardLookup && cardLookupOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/70 lg:landscape:hidden"
            onClick={() => setCardLookupOpen(false)}
            aria-hidden="true"
          />
        ) : null}
        {showMemberCardLookup && memberCardLookup ? (
          <div
            role="dialog"
            aria-label={t("cashier.payment.tapMemberCard")}
            className={[
              "rounded border border-blue-400/40 bg-[#111111] text-sm",
              cardLookupOpen
                ? [
                    "fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-1.5rem),32rem)] -translate-x-1/2 -translate-y-1/2",
                    "max-h-[min(90dvh,44rem)] overflow-y-auto overscroll-contain rounded-2xl p-4",
                    "pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]",
                    "lg:landscape:static lg:landscape:left-auto lg:landscape:top-auto lg:landscape:z-auto",
                    "lg:landscape:mt-2 lg:landscape:w-auto lg:landscape:max-w-none lg:landscape:max-h-none",
                    "lg:landscape:translate-x-0 lg:landscape:translate-y-0 lg:landscape:overflow-visible",
                    "lg:landscape:rounded lg:landscape:p-3 lg:landscape:pt-3 lg:landscape:pb-3",
                  ].join(" ")
                : "hidden lg:landscape:mt-2 lg:landscape:block",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm text-slate-300 lg:landscape:text-xs lg:landscape:text-slate-400">
                {t("cashier.payment.tapMemberCard")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="min-h-11 shrink-0 px-3 lg:landscape:hidden"
                onClick={() => setCardLookupOpen(false)}
              >
                {t("cashier.payment.closeCardLookup")}
              </Button>
            </div>
            <input
              value={memberCardLookup.cardUid}
              onChange={(event) =>
                memberCardLookup.onCardUidChange(event.target.value)
              }
              placeholder={t("crm.cardUid")}
              className="mt-3 min-h-12 w-full min-w-0 rounded border border-slate-600 bg-slate-900 px-3 text-base text-white outline-none focus:border-blue-400 lg:landscape:mt-2 lg:landscape:min-h-11 lg:landscape:text-sm"
            />
            <div className="mt-3 lg:landscape:mt-2">
              <CardCaptureStatus
                nfcSupported={memberCardLookup.nfcSupported}
                nfcActive={memberCardLookup.nfcActive}
                nfcError={memberCardLookup.nfcError}
                lastUid={memberCardLookup.lastUid}
                onEnableNfc={memberCardLookup.onEnableNfc}
              />
            </div>
            <Button
              type="button"
              className="mt-3 min-h-12 w-full lg:landscape:mt-2 lg:landscape:min-h-10 lg:landscape:w-auto"
              onClick={memberCardLookup.onDetect}
              disabled={
                memberCardLookup.isLoading || !memberCardLookup.cardUid.trim()
              }
            >
              {memberCardLookup.isLoading
                ? t("cashier.payment.lookingUpMemberCard")
                : t("cashier.payment.lookupMemberCard")}
            </Button>
            {memberCardLookup.guestName || memberCardLookup.walletNumber ? (
              <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
                <p className="text-xs uppercase tracking-wide">
                  {t("cashier.payment.memberWallet")}
                </p>
                <p className="mt-1 break-words text-base font-semibold">
                  {memberCardLookup.guestName || memberCardLookup.walletNumber}
                </p>
                {memberCardLookup.walletNumber ? (
                  <p className="break-all text-xs text-emerald-200">
                    {memberCardLookup.walletNumber}
                  </p>
                ) : null}
                {memberCardLookup.balance ? (
                  <p className="mt-1 text-lg tabular-nums">
                    {formatMoney(Number(memberCardLookup.balance))}
                  </p>
                ) : null}
                {memberCardLookup.status ? (
                  <p className="text-xs uppercase text-emerald-200">
                    {memberCardLookup.status}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] text-emerald-200/80">
                  {t("cashier.payment.memberBalanceHint")}
                </p>
              </div>
            ) : null}
            {memberCardLookup.error ? (
              <p className="mt-2 text-sm text-red-300">{memberCardLookup.error}</p>
            ) : null}
          </div>
        ) : null}
        {showMemberCardLookup && memberCardLookup && !cardLookupOpen ? (
          <button
            type="button"
            className="mt-2 min-h-12 w-full rounded border border-blue-400/40 bg-[#111111] px-3 text-left text-sm font-semibold text-blue-100 lg:landscape:hidden"
            onClick={() => setCardLookupOpen(true)}
          >
            {t("cashier.payment.reopenCardLookup")}
          </button>
        ) : null}
        <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto">
          {sortedMethods.map((method) => {
            const selected = selectedMethodId === method.id;
            const memberCard = isMemberCardPaymentMethod(method);
            const cash =
              String(method.kind || method.code || "").toUpperCase() === "CASH" ||
              /cash/i.test(method.name);
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  onSelectMethod(method.id);
                  if (memberCard) setCardLookupOpen(true);
                }}
                className={[
                  "flex min-h-[4.75rem] flex-col items-center justify-center rounded border bg-white px-2 text-slate-900 transition md:min-h-[6.5rem]",
                  selected
                    ? "border-blue-500 ring-2 ring-blue-400"
                    : "border-slate-200 hover:border-blue-300",
                ].join(" ")}
              >
                {memberCard ? <MemberCardIcon /> : cash ? <CashIcon /> : <WalletIcon />}
                <span className="mt-1 text-center text-[11px] font-bold leading-tight">
                  {methodLabel(method, memberCardLabel)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
