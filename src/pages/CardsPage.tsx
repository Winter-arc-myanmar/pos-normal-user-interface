import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { CardCaptureStatus } from "@/components/ui/CardCaptureStatus";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import { useCardCapture } from "@/core/presentation/hooks/useCardCapture";
import { useCashier } from "@/core/presentation/hooks/useCashier";
import {
  CardTopupPrefill,
  useCardTopupFlow,
} from "@/core/presentation/hooks/useCardTopupFlow";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useNumberFormatter } from "@/lib/i18n/formatters";
import {
  assertPaymentReference,
  paymentRequiresReference,
} from "@/lib/pos/paymentReference";

const numpadRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "back"],
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
          ? "bg-emerald-500 text-white"
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
  const { t } = useTranslation();
  const { formatCurrency } = useNumberFormatter();

  return (
    <div
      id="card-topup-receipt"
      className="mx-auto w-full max-w-sm rounded-lg border border-dashed border-slate-600 bg-white p-6 text-slate-900 print:border-black print:shadow-none"
    >
      <p className="text-center text-sm font-semibold uppercase tracking-wide">
        {t("cardTopup.receiptTitle")}
      </p>
      <p className="mt-1 text-center text-xs text-slate-500">{printedAt}</p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">{t("cardTopup.receiptLabel")}</span>
          <span className="font-medium">{receiptId}</span>
        </div>
        {customerName ? (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">{t("cardTopup.member")}</span>
            <span className="font-medium">{customerName}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">{t("cardTopup.card")}</span>
          <span className="font-medium">{cardNumber}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
          <span className="text-slate-500">{t("cardTopup.topupAmount")}</span>
          <span className="font-semibold">{formatCurrency(Number(amount))}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">{t("cardTopup.balanceAfter")}</span>
          <span className="font-semibold">
            {formatCurrency(Number(balanceAfter))}
          </span>
        </div>
      </div>
    </div>
  );
}

function DarkPaymentSelect({
  label,
  methods,
  value,
  onChange,
}: {
  label: string;
  methods: PaymentMethod[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 text-white outline-none focus:border-emerald-500"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{label}</option>
      {methods.map((method) => (
        <option key={method.id} value={method.id}>
          {method.name}
        </option>
      ))}
    </select>
  );
}

export function CardsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { formatCurrency } = useNumberFormatter();
  const { requireCashierContext } = usePosWorkspace();
  const { paymentMethods, fetchPaymentMethods } = useCashier();
  const prefillAppliedRef = useRef(false);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    step,
    cardNumber,
    detectedCard,
    detectedWallet,
    customerName,
    customerPhone,
    amountOptions,
    selectedAmount,
    customAmount,
    receipt,
    isLoading,
    error,
    setCardNumber,
    setSelectedAmount,
    setCustomAmount,
    goToStep,
    startTopup,
    startTopupFromPrefill,
    detectCard,
    confirmAmount,
    confirmAndPrint,
    resetFlow,
  } = useCardTopupFlow();
  const pendingDetectRef = useRef(false);
  const { nfcSupported, nfcActive, nfcError, lastUid, startNfc } = useCardCapture({
    enabled: step === "detect",
    onRead: (uid) => {
      pendingDetectRef.current = true;
      setCardNumber(uid);
    },
  });

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.id === paymentMethodId
  );
  const activeAmount = selectedAmount || customAmount;
  const displayError = actionError || error;

  useEffect(() => {
    void fetchPaymentMethods().catch(() => undefined);
  }, [fetchPaymentMethods]);

  useEffect(() => {
    if (!paymentMethods.length || paymentMethodId) return;
    setPaymentMethodId(paymentMethods[0].id);
  }, [paymentMethodId, paymentMethods]);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const prefill = location.state as CardTopupPrefill | null;
    if (!prefill?.cardNumber?.trim()) return;
    prefillAppliedRef.current = true;
    startTopupFromPrefill(prefill);
  }, [location.state, startTopupFromPrefill]);

  useEffect(() => {
    if (step !== "detect" || !pendingDetectRef.current || !cardNumber.trim()) {
      return;
    }
    pendingDetectRef.current = false;
    void detectCard();
  }, [cardNumber, detectCard, step]);

  const stepIndex = ["menu", "detect", "amount", "print"].indexOf(step);

  const previewReceipt = useMemo(() => {
    if (receipt) return receipt;
    if (!detectedCard || !activeAmount) return null;
    return {
      receiptId: "preview",
      cardNumber: detectedCard.cardUid,
      customerName: customerName || undefined,
      amount: activeAmount,
      balanceAfter: detectedWallet?.balance || "0.0000",
      printedAt: new Date().toISOString(),
    };
  }, [activeAmount, customerName, detectedCard, detectedWallet, receipt]);

  const handleConfirmPrint = async () => {
    setActionError(null);
    try {
      const context = await requireCashierContext();
      assertPaymentReference(selectedPaymentMethod, paymentReference);
      await confirmAndPrint({
        locationId: context.locationId,
        posSessionId: context.posSessionId,
        paymentMethodId,
        reference: paymentReference,
      });
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : t("cardTopup.confirmFailed")
      );
    }
  };

  const appendInput = (value: string) => {
    if (value === "back") {
      setCustomAmount(customAmount.slice(0, -1));
      setSelectedAmount("");
      return;
    }
    setSelectedAmount("");
    setCustomAmount(`${customAmount}${value}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1115] text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("cards.title")}</h1>
            <p className="text-sm text-slate-400">{t("cards.subtitle")}</p>
          </div>
          {step !== "menu" ? (
            <div className="flex flex-wrap gap-2">
              <StepBadge
                label={t("cardTopup.steps.detect")}
                active={step === "detect"}
                done={stepIndex > 1}
              />
              <StepBadge
                label={t("cardTopup.steps.amount")}
                active={step === "amount"}
                done={stepIndex > 2}
              />
              <StepBadge
                label={t("cardTopup.steps.print")}
                active={step === "print"}
                done={Boolean(receipt)}
              />
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-h-0 rounded-xl border border-slate-800 bg-[#151821] p-5">
          {step === "menu" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-left transition hover:bg-emerald-500/20"
                onClick={startTopup}
              >
                <p className="text-lg font-semibold">{t("cards.menuTopup")}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {t("cards.menuTopupHint")}
                </p>
              </button>
              <button
                type="button"
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-left transition hover:bg-amber-500/20"
                onClick={() => navigate("/cards/refund")}
              >
                <p className="text-lg font-semibold">{t("cards.menuRefund")}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {t("cards.menuRefundHint")}
                </p>
              </button>
            </div>
          ) : null}

          {step === "detect" ? (
            <div className="mx-auto flex max-w-xl flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t("cardTopup.cardNumber")}
                </label>
                <input
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  placeholder={t("cardTopup.cardNumberPlaceholder")}
                  className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 text-lg text-white outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <CardCaptureStatus
                nfcSupported={nfcSupported}
                nfcActive={nfcActive}
                nfcError={nfcError}
                lastUid={lastUid}
                onEnableNfc={() => void startNfc()}
              />
              <p className="text-sm text-slate-400">{t("cardTopup.detectHint")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => goToStep("menu")}
                  variant="secondary"
                >
                  {t("cards.backToMenu")}
                </Button>
                <Button
                  type="button"
                  onClick={() => detectCard()}
                  disabled={isLoading || !cardNumber.trim()}
                >
                  {isLoading ? t("cardTopup.detecting") : t("cardTopup.detect")}
                </Button>
              </div>
            </div>
          ) : null}

          {step === "amount" && detectedCard ? (
            <div className="flex h-full flex-col gap-5">
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">{t("cardTopup.detectedCard")}</p>
                <p className="mt-1 text-xl font-semibold">{detectedCard.cardUid}</p>
                {customerName ? (
                  <p className="mt-1 text-sm text-slate-300">{customerName}</p>
                ) : null}
                {customerPhone ? (
                  <p className="text-sm text-slate-400">{customerPhone}</p>
                ) : null}
                <p className="mt-3 text-sm text-slate-400">
                  {t("cardTopup.currentBalance")}{" "}
                  <span className="font-semibold text-white">
                    {formatCurrency(Number(detectedWallet?.balance || 0))}
                  </span>
                </p>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-300">
                  {t("cardTopup.predefinedAmounts")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {amountOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`min-h-16 rounded-lg border px-4 py-3 text-left text-lg font-semibold ${
                        selectedAmount === option.amount
                          ? "border-emerald-500 bg-emerald-500/20 text-white"
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
                  {t("cardTopup.customAmount")}
                </label>
                <input
                  value={customAmount}
                  onChange={(event) => {
                    setCustomAmount(event.target.value);
                    setSelectedAmount("");
                  }}
                  placeholder="0.00"
                  className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 text-lg text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => goToStep("detect")}
                >
                  {t("cardTopup.back")}
                </Button>
                <Button
                  type="button"
                  onClick={confirmAmount}
                  disabled={!activeAmount || Number(activeAmount) <= 0}
                >
                  {t("cardTopup.continueToPrint")}
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
              {!receipt ? (
                <div className="space-y-3 print:hidden">
                  <DarkPaymentSelect
                    label={t("crm.paymentMethod")}
                    methods={paymentMethods}
                    value={paymentMethodId}
                    onChange={setPaymentMethodId}
                  />
                  <input
                    aria-label={t("crm.reference")}
                    placeholder={
                      paymentRequiresReference(selectedPaymentMethod)
                        ? t("crm.referenceRequired")
                        : t("crm.reference")
                    }
                    className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 text-white outline-none focus:border-emerald-500"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button type="button" variant="secondary" onClick={() => goToStep("amount")}>
                  {t("cardTopup.back")}
                </Button>
                {!receipt ? (
                  <Button
                    type="button"
                    onClick={() => void handleConfirmPrint()}
                    disabled={isLoading || !paymentMethodId}
                  >
                    {isLoading ? t("cardTopup.printing") : t("cardTopup.confirmPrint")}
                  </Button>
                ) : (
                  <>
                    <Button type="button" onClick={() => window.print()}>
                      {t("cardTopup.printAgain")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetFlow}>
                      {t("cardTopup.newTopup")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {displayError ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {displayError}
            </p>
          ) : null}
        </section>

        {step === "detect" || step === "amount" ? (
          <aside className="rounded-xl border border-slate-800 bg-[#111111] p-4 print:hidden">
            <p className="mb-3 text-sm font-semibold text-slate-300">
              {t("cardTopup.keypad")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {numpadRows.flat().map((key) => (
                <button
                  key={key}
                  type="button"
                  className="min-h-12 rounded-lg bg-slate-800 text-lg font-semibold text-white hover:bg-slate-700"
                  onClick={() => appendInput(key)}
                >
                  {key === "back" ? "⌫" : key}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">{t("cardTopup.keypadHint")}</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
