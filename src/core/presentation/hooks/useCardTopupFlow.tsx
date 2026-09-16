import { useCallback, useState } from "react";
import {
  GuestCard,
  GuestWallet,
  GuestWalletLedgerEntry,
} from "../../domain/entities/GuestWallet";
import { IGuestWalletService } from "../../domain/services/IGuestWalletService";
import container from "../../infrastructure/di/container";
import {
  GUEST_WALLET_AMOUNT_OPTIONS,
  GuestWalletAmountOption,
  isUnspendableWalletStatus,
} from "@/lib/pos/guestWalletAmounts";

export type CardTopupStep = "menu" | "detect" | "amount" | "print";

export interface CardTopupPrefill {
  cardNumber: string;
  balance: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  tenantId?: string;
  walletId?: string;
}

export interface CardTopupReceipt {
  receiptId: string;
  cardNumber: string;
  customerName?: string;
  amount: string;
  balanceAfter: string;
  printedAt: string;
}

export interface CardTopupConfirmInput {
  locationId: string;
  posSessionId: string;
  paymentMethodId: string;
  reference?: string;
}

interface UseCardTopupFlowReturn {
  step: CardTopupStep;
  cardNumber: string;
  detectedCard: GuestCard | null;
  detectedWallet: GuestWallet | null;
  customerName: string | null;
  customerPhone: string | null;
  amountOptions: GuestWalletAmountOption[];
  selectedAmount: string;
  customAmount: string;
  receipt: CardTopupReceipt | null;
  isLoading: boolean;
  error: string | null;
  setCardNumber: (value: string) => void;
  setSelectedAmount: (value: string) => void;
  setCustomAmount: (value: string) => void;
  goToStep: (step: CardTopupStep) => void;
  startTopup: () => void;
  startTopupFromPrefill: (prefill: CardTopupPrefill) => void;
  detectCard: () => Promise<void>;
  confirmAmount: () => void;
  confirmAndPrint: (input: CardTopupConfirmInput) => Promise<void>;
  resetFlow: () => void;
  clearError: () => void;
}

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useCardTopupFlow(): UseCardTopupFlowReturn {
  const guestWalletService = container.resolve<IGuestWalletService>(
    "guestWalletService"
  );

  const [step, setStep] = useState<CardTopupStep>("menu");
  const [cardNumber, setCardNumber] = useState("");
  const [detectedCard, setDetectedCard] = useState<GuestCard | null>(null);
  const [detectedWallet, setDetectedWallet] = useState<GuestWallet | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [receipt, setReceipt] = useState<CardTopupReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const resetFlow = useCallback(() => {
    setStep("menu");
    setCardNumber("");
    setDetectedCard(null);
    setDetectedWallet(null);
    setCustomerName(null);
    setCustomerPhone(null);
    setSelectedAmount("");
    setCustomAmount("");
    setReceipt(null);
    setError(null);
  }, []);

  const goToStep = useCallback((nextStep: CardTopupStep) => {
    setError(null);
    setStep(nextStep);
  }, []);

  const startTopup = useCallback(() => {
    setError(null);
    setCardNumber("");
    setDetectedCard(null);
    setDetectedWallet(null);
    setCustomerName(null);
    setCustomerPhone(null);
    setSelectedAmount("");
    setCustomAmount("");
    setReceipt(null);
    setStep("detect");
  }, []);

  const startTopupFromPrefill = useCallback(
    (prefill: CardTopupPrefill) => {
      if (!prefill.cardNumber?.trim()) {
        startTopup();
        return;
      }

      setError(null);
      setReceipt(null);
      setSelectedAmount("");
      setCustomAmount("");
      setCardNumber(prefill.cardNumber);
      setCustomerName(prefill.customerName || null);
      setCustomerPhone(prefill.customerPhone || null);
      setDetectedCard(
        new GuestCard({
          id: prefill.customerId || "",
          cardUid: prefill.cardNumber,
          walletId: prefill.walletId || "",
          status: "ACTIVE",
        })
      );
      setDetectedWallet(
        new GuestWallet({
          id: prefill.walletId || "",
          guestName: prefill.customerName || "",
          guestPhone: prefill.customerPhone || "",
          balance: prefill.balance || "0.0000",
          status: "ACTIVE",
        })
      );
      setStep("amount");
    },
    [startTopup]
  );

  const detectCard = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();
      const card = await guestWalletService.lookupCard(cardNumber.trim());
      if (card.status && card.status.toUpperCase() !== "ACTIVE") {
        throw new Error("This card is not active");
      }
      const wallet =
        card.wallet ||
        (card.walletId ? await guestWalletService.getWallet(card.walletId) : null);
      if (!wallet) {
        throw new Error("No guest wallet is linked to this card");
      }
      if (isUnspendableWalletStatus(wallet.status)) {
        throw new Error("This wallet cannot be topped up right now");
      }
      setDetectedCard(card);
      setDetectedWallet(wallet);
      setCustomerName(wallet.guestName || null);
      setCustomerPhone(wallet.guestPhone || null);
      setCardNumber(card.cardUid);
      setStep("amount");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to detect guest card";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [cardNumber, clearError, guestWalletService]);

  const resolveAmount = useCallback((): string => {
    if (selectedAmount) return selectedAmount;
    return customAmount.trim();
  }, [customAmount, selectedAmount]);

  const confirmAmount = useCallback(() => {
    const amount = resolveAmount();
    if (parseAmount(amount) <= 0) {
      setError("Topup amount must be greater than zero");
      return;
    }
    clearError();
    setStep("print");
  }, [clearError, resolveAmount]);

  const confirmAndPrint = useCallback(
    async (input: CardTopupConfirmInput) => {
      const amount = resolveAmount();
      if (!detectedCard?.cardUid || !detectedWallet?.id) {
        setError("Card must be detected before printing");
        return;
      }
      if (parseAmount(amount) <= 0) {
        setError("Topup amount must be greater than zero");
        return;
      }
      if (!input.paymentMethodId?.trim()) {
        setError("Payment method is required");
        return;
      }

      try {
        setIsLoading(true);
        clearError();
        const entry: GuestWalletLedgerEntry = await guestWalletService.topUpWallet(
          detectedWallet.id,
          {
            amount,
            paymentMethodId: input.paymentMethodId,
            posSessionId: input.posSessionId,
            locationId: input.locationId,
            reference: input.reference?.trim() || undefined,
            guestCardId: detectedCard.id?.trim() || undefined,
          }
        );
        const wallet = await guestWalletService.getWallet(detectedWallet.id);
        setDetectedWallet(wallet);
        setReceipt({
          receiptId: entry.id || `topup-${Date.now()}`,
          cardNumber: detectedCard.cardUid,
          customerName: wallet.guestName || customerName || undefined,
          amount,
          balanceAfter: entry.balanceAfter || wallet.balance,
          printedAt: entry.createdAt || new Date().toISOString(),
        });
        window.print();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to complete card top up";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      clearError,
      customerName,
      detectedCard,
      detectedWallet,
      guestWalletService,
      resolveAmount,
    ]
  );

  return {
    step,
    cardNumber,
    detectedCard,
    detectedWallet,
    customerName,
    customerPhone,
    amountOptions: GUEST_WALLET_AMOUNT_OPTIONS,
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
    clearError,
  };
}
