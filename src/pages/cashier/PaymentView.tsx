import { useMemo } from "react";
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
  onToggleSplit: () => void;
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
  onToggleSplit,
  onAddTender,
  onRemoveTender,
}: PaymentViewProps) {
  const { t } = useTranslation();
  const remaining = remainingReceivable(total, isSplitMode ? splitTenders : []);
  const displayRemaining = isSplitMode ? remaining : Number(total || 0);
  const billSubtotal = Number(subtotal || total || 0);
  const billTotal = Number(total || 0);
  const memberCardLabel = t("cashier.payment.memberCard");
  const sortedMethods = useMemo(
    () => [...methods].sort((a, b) => methodRank(a) - methodRank(b)),
    [methods]
  );

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(11rem,16rem)_3.75rem_minmax(0,1fr)] overflow-hidden bg-[#202020] text-white">
      <aside className="flex min-h-0 flex-col border-r border-white/10 p-2">
        <div className="rounded bg-white p-3 text-slate-900">
          <p className="text-sm font-semibold">{t("cashier.payment.bill")}</p>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-slate-500">{t("cashier.payment.subtotal")}</span>
            <span>{billSubtotal.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm font-semibold">
            <span>{t("cashier.total")}</span>
            <span>{billTotal.toFixed(2)}</span>
          </div>
        </div>

        {isSplitMode ? (
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded border border-white/10 bg-black/25 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t("cashier.payment.split")}
            </p>
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
              disabled={!selectedMethodId || Number(paymentAmount) <= 0 || isLoading}
              onClick={onAddTender}
            >
              {t("cashier.payment.addTender")}
            </Button>
            {splitTenders.map((tender) => {
              const method = methods.find((item) => item.id === tender.paymentMethodId);
              return (
                <div
                  key={tender.id}
                  className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-xs"
                >
                  <span className="truncate">
                    {method ? methodLabel(method, memberCardLabel) : tender.paymentMethodId}
                  </span>
                  <span className="ml-2 shrink-0">{Number(tender.amount).toFixed(2)}</span>
                  <button
                    type="button"
                    className="ml-2 text-red-300"
                    onClick={() => onRemoveTender(tender.id)}
                  >
                    {t("cashier.orderPanel.remove")}
                  </button>
                </div>
              );
            })}
            {!splitTenders.length ? (
              <p className="text-xs text-slate-400">{t("cashier.payment.splitHint")}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">{t("cashier.payment.splitRailHint")}</p>
        )}
      </aside>

      <div className="flex flex-col items-center gap-1 border-r border-white/10 bg-[#171717] p-1">
        <button
          type="button"
          onClick={onToggleSplit}
          aria-pressed={isSplitMode}
          aria-label={t("cashier.payment.split")}
          className={[
            "flex min-h-24 w-full flex-col items-center justify-center rounded px-1 py-2 text-[11px] font-semibold",
            isSplitMode ? "bg-blue-700 text-white" : "bg-blue-600 text-white hover:bg-blue-500",
          ].join(" ")}
        >
          <SplitIcon />
          <span className="mt-1">{t("cashier.payment.split")}</span>
        </button>
      </div>

      <div className="flex min-h-0 flex-col p-2">
        <div className="flex min-h-12 items-center rounded bg-blue-600 px-3 text-sm font-semibold">
          {t("cashier.payment.remaining", {
            amount: displayRemaining.toFixed(2),
          })}
        </div>
        <div className="mt-2 grid min-h-0 flex-1 auto-rows-[6.5rem] grid-cols-2 gap-2 overflow-y-auto">
          {sortedMethods.map((method) => {
            const selected = selectedMethodId === method.id;
            const memberCard = isMemberCardPaymentMethod(method);
            const cash = /cash/i.test(method.name);
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => onSelectMethod(method.id)}
                className={[
                  "flex flex-col items-center justify-center rounded border bg-white px-2 text-slate-900 transition",
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
