import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import {
  CardRefundPrefill,
  useCardRefundFlow,
} from "@/core/presentation/hooks/useCardRefundFlow";
import { useNumberFormatter } from "@/lib/i18n/formatters";

const amountNumpadRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "back"],
];

const pinNumpadRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "back"],
];

function StepBadge({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-amber-500 text-white"
          : done
            ? "bg-slate-700 text-slate-200"
            : "bg-slate-800 text-slate-500"
      }`}
    >
      {label}
    </div>
  );
}

function ReceiptPreview({
  cardNumber,
  customerName,
  amount,
  balanceAfter,
  receiptId,
  printedAt,
}: {
  cardNumber: string;
  customerName?: string;
  amount: string;
  balanceAfter: string;
  receiptId: string;
  printedAt: string;
}) {
  const { formatCurrency } = useNumberFormatter();

  return (
    <div
      id="card-refund-receipt"
      className="mx-auto w-full max-w-sm rounded-lg border border-dashed border-slate-600 bg-white p-6 text-slate-900 print:border-black print:shadow-none"
    >
      <p className="text-center text-sm font-semibold uppercase tracking-wide">
        Card Refund Receipt
      </p>
      <p className="mt-1 text-center text-xs text-slate-500">{printedAt}</p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Receipt</span>
          <span className="font-medium">{receiptId}</span>
        </div>
        {customerName ? (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Member</span>
            <span className="font-medium">{customerName}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Card</span>
          <span className="font-medium">{cardNumber}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
          <span className="text-slate-500">Refund</span>
          <span className="font-semibold">{formatCurrency(Number(amount))}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Balance after</span>
          <span className="font-semibold">
            {formatCurrency(Number(balanceAfter))}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CardRefundPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useNumberFormatter();
  const prefillAppliedRef = useRef(false);
  const {
    step,
    cardNumber,
    pin,
    detectedCard,
    customerName,
    customerPhone,
    amountOptions,
    selectedAmount,
    customAmount,
    receipt,
    isLoading,
    error,
    setCardNumber,
    setPin,
    setSelectedAmount,
    setCustomAmount,
    goToStep,
    startRefundFromPrefill,
    detectCard,
    verifyPin,
    confirmAmount,
    confirmAndPrint,
    resetFlow,
  } = useCardRefundFlow();

  const tenantId = user?.tenantId || "";
  const activeAmount = selectedAmount || customAmount;
  const stepOrder = ["detect", "pin", "amount", "print"];
  const stepIndex = stepOrder.indexOf(step);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const prefill = location.state as CardRefundPrefill | null;
    if (!prefill?.cardNumber?.trim()) return;
    prefillAppliedRef.current = true;
    startRefundFromPrefill(prefill);
  }, [location.state, startRefundFromPrefill]);

  const previewReceipt = useMemo(() => {
    if (receipt) return receipt;
    if (!detectedCard || !activeAmount) return null;
    return {
      receiptId: "preview",
      cardNumber: detectedCard.cardNumber,
      customerName: customerName || undefined,
      amount: activeAmount,
      balanceAfter: detectedCard.balance,
      printedAt: new Date().toISOString(),
    };
  }, [activeAmount, customerName, detectedCard, receipt]);

  const appendKeypadInput = (value: string) => {
    if (value === "back") {
      if (step === "detect") {
        setCardNumber(cardNumber.slice(0, -1));
      } else if (step === "pin") {
        setPin(pin.slice(0, -1));
      } else if (step === "amount") {
        setCustomAmount(customAmount.slice(0, -1));
        setSelectedAmount("");
      }
      return;
    }
    if (!value) return;

    if (step === "detect") {
      setCardNumber(`${cardNumber}${value}`);
      return;
    }
    if (step === "pin") {
      setPin(`${pin}${value}`);
      return;
    }
    if (step === "amount") {
      setSelectedAmount("");
      setCustomAmount(`${customAmount}${value}`);
    }
  };

  const keypadRows =
    step === "pin" ? pinNumpadRows : amountNumpadRows;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1115] text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("cards.menuRefund")}</h1>
            <p className="text-sm text-slate-400">{t("cardRefund.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StepBadge
              label={t("cardRefund.steps.detect")}
              active={step === "detect"}
              done={stepIndex > 0}
            />
            <StepBadge
              label={t("cardRefund.steps.pin")}
              active={step === "pin"}
              done={stepIndex > 1}
            />
            <StepBadge
              label={t("cardRefund.steps.amount")}
              active={step === "amount"}
              done={stepIndex > 2}
            />
            <StepBadge
              label={t("cardRefund.steps.print")}
              active={step === "print"}
              done={Boolean(receipt)}
            />
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-h-0 rounded-xl border border-slate-800 bg-[#151821] p-5">
          {step === "detect" ? (
            <div className="mx-auto flex max-w-xl flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t("cardRefund.cardNumber")}
                </label>
                <input
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  placeholder={t("cardRefund.cardNumberPlaceholder")}
                  className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 text-lg text-white outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              <p className="text-sm text-slate-400">{t("cardRefund.detectHint")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => navigate("/cards")}
                  variant="secondary"
                >
                  {t("cards.backToMenu")}
                </Button>
                <Button
                  type="button"
                  onClick={() => detectCard()}
                  disabled={isLoading || !cardNumber.trim()}
                >
                  {isLoading ? t("cardRefund.detecting") : t("cardRefund.detect")}
                </Button>
              </div>
            </div>
          ) : null}

          {step === "pin" && detectedCard ? (
            <div className="mx-auto flex max-w-xl flex-col gap-4">
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">{t("cardRefund.detectedCard")}</p>
                <p className="mt-1 text-xl font-semibold">{detectedCard.cardNumber}</p>
                {customerName ? (
                  <p className="mt-1 text-sm text-slate-300">{customerName}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t("cardRefund.pin")}
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  placeholder={t("cardRefund.pinPlaceholder")}
                  className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 text-lg text-white outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              <p className="text-sm text-slate-400">{t("cardRefund.pinHint")}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => goToStep("detect")}>
                  {t("cardRefund.back")}
                </Button>
                <Button
                  type="button"
                  onClick={() => verifyPin()}
                  disabled={isLoading || !pin.trim()}
                >
                  {isLoading ? t("cardRefund.verifyingPin") : t("cardRefund.verifyPin")}
                </Button>
              </div>
            </div>
          ) : null}

          {step === "amount" && detectedCard ? (
            <div className="flex h-full flex-col gap-5">
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">{t("cardRefund.detectedCard")}</p>
                <p className="mt-1 text-xl font-semibold">{detectedCard.cardNumber}</p>
                {customerName ? (
                  <p className="mt-1 text-sm text-slate-300">{customerName}</p>
                ) : null}
                {customerPhone ? (
                  <p className="text-sm text-slate-400">{customerPhone}</p>
                ) : null}
                <p className="mt-3 text-sm text-slate-400">
                  {t("cardRefund.currentBalance")}{" "}
                  <span className="font-semibold text-white">
                    {formatCurrency(Number(detectedCard.balance))}
                  </span>
                </p>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-300">
                  {t("cardRefund.predefinedAmounts")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {amountOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`min-h-16 rounded-lg border px-4 py-3 text-left text-lg font-semibold ${
                        selectedAmount === option.amount
                          ? "border-amber-500 bg-amber-500/20 text-white"
                          : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                      }`}
                      onClick={() => {
                        setSelectedAmount(option.amount);
                        setCustomAmount("");
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t("cardRefund.customAmount")}
                </label>
                <input
                  value={customAmount}
                  onChange={(event) => {
                    setCustomAmount(event.target.value);
                    setSelectedAmount("");
                  }}
                  placeholder="0.00"
                  className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 text-lg text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => goToStep("pin")}>
                  {t("cardRefund.back")}
                </Button>
                <Button
                  type="button"
                  onClick={confirmAmount}
                  disabled={!activeAmount || Number(activeAmount) <= 0}
                >
                  {t("cardRefund.continueToPrint")}
                </Button>
              </div>
            </div>
          ) : null}

          {step === "print" && detectedCard && previewReceipt ? (
            <div className="flex h-full flex-col gap-5">
              <ReceiptPreview
                cardNumber={previewReceipt.cardNumber}
                customerName={previewReceipt.customerName}
                amount={previewReceipt.amount}
                balanceAfter={previewReceipt.balanceAfter}
                receiptId={previewReceipt.receiptId}
                printedAt={previewReceipt.printedAt}
              />
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button type="button" variant="secondary" onClick={() => goToStep("amount")}>
                  {t("cardRefund.back")}
                </Button>
                {!receipt ? (
                  <Button
                    type="button"
                    onClick={() => confirmAndPrint(tenantId)}
                    disabled={isLoading || !tenantId}
                  >
                    {isLoading ? t("cardRefund.printing") : t("cardRefund.confirmPrint")}
                  </Button>
                ) : (
                  <>
                    <Button type="button" onClick={() => window.print()}>
                      {t("cardRefund.printAgain")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate("/cards")}
                    >
                      {t("cards.backToMenu")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetFlow}>
                      {t("cardRefund.newRefund")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </section>

        {step === "detect" || step === "pin" || step === "amount" ? (
          <aside className="rounded-xl border border-slate-800 bg-[#111111] p-4 print:hidden">
            <p className="mb-3 text-sm font-semibold text-slate-300">
              {t("cardRefund.keypad")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {keypadRows.flat().map((key, index) =>
                key ? (
                  <button
                    key={`${key}-${index}`}
                    type="button"
                    className="min-h-12 rounded-lg bg-slate-800 text-lg font-semibold text-white hover:bg-slate-700"
                    onClick={() => appendKeypadInput(key)}
                  >
                    {key === "back" ? "⌫" : key}
                  </button>
                ) : (
                  <span key={`spacer-${index}`} />
                )
              )}
            </div>
            <p className="mt-4 text-xs text-slate-500">{t("cardRefund.keypadHint")}</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
