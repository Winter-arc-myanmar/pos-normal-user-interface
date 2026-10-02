import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { GuestCard, GuestWallet } from "../../domain/entities/GuestWallet";
import { IGuestWalletService } from "../../domain/services/IGuestWalletService";
import container from "../../infrastructure/di/container";
import { CardRefundPolicy } from "../../application/services/CardRefundPolicy";
import {
  GUEST_WALLET_AMOUNT_OPTIONS,
  GuestWalletAmountOption,
  isUnspendableWalletStatus,
} from "@/lib/pos/guestWalletAmounts";

export type CardRefundStep = "detect" | "amount" | "print";

export interface CardRefundPrefill {
  cardNumber: string;
  balance: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  tenantId?: string;
  walletId?: string;
}

export interface CardRefundReceipt {
  receiptId: string;
  cardNumber: string;
  customerName?: string;
  amount: string;
  balanceAfter: string;
  printedAt: string;
}

export interface CardRefundConfirmInput {
  locationId: string;
  posSessionId: string;
  paymentMethodId: string;
  approverAuthorization: string;
  reference?: string;
  notes?: string;
}

interface UseCardRefundFlowReturn {
  step: CardRefundStep;
  cardNumber: string;
  detectedCard: GuestCard | null;
  detectedWallet: GuestWallet | null;
  customerName: string | null;
  customerPhone: string | null;
  amountOptions: GuestWalletAmountOption[];
  maxRefundAmount: number;
  selectedAmount: string;
  customAmount: string;
  receipt: CardRefundReceipt | null;
  isLoading: boolean;
  error: string | null;
  setCardNumber: (value: string) => void;
  setSelectedAmount: (value: string) => void;
  setCustomAmount: (value: string) => void;
  goToStep: (step: CardRefundStep) => void;
  startRefundFromPrefill: (prefill: CardRefundPrefill) => void;
  detectCard: () => Promise<void>;
  confirmAmount: () => void;
  confirmAndPrint: (
    input: CardRefundConfirmInput
  ) => Promise<CardRefundReceipt | undefined>;
  resetFlow: () => void;
  clearError: () => void;
}

export function useCardRefundFlow(): UseCardRefundFlowReturn {
  const { t } = useTranslation();
  const guestWalletService = container.resolve<IGuestWalletService>(
    "guestWalletService"
  );

  const [step, setStep] = useState<CardRefundStep>("detect");
  const [cardNumber, setCardNumber] = useState("");
  const [detectedCard, setDetectedCard] = useState<GuestCard | null>(null);
  const [detectedWallet, setDetectedWallet] = useState<GuestWallet | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [receipt, setReceipt] = useState<CardRefundReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const resetFlow = useCallback(() => {
    setStep("detect");
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

  const goToStep = useCallback((nextStep: CardRefundStep) => {
    setError(null);
    setStep(nextStep);
  }, []);

  const startRefundFromPrefill = useCallback(
    (prefill: CardRefundPrefill) => {
      if (!prefill.cardNumber?.trim()) {
        resetFlow();
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
          purchasedBalance: prefill.balance || "0.0000",
          balance: prefill.balance || "0.0000",
          status: "ACTIVE",
        })
      );
      setStep("amount");
    },
    [resetFlow]
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
        throw new Error("This wallet cannot be refunded right now");
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

  const maxRefundAmount = CardRefundPolicy.refundableAmount(detectedWallet || {});

  const refundAmountError = useCallback(
    (err: unknown) => {
      if (err instanceof Error && err.message.toLowerCase().includes("exceed")) {
        return t("cardRefund.exceedsBalance");
      }
      if (err instanceof Error) return err.message;
      return t("cardRefund.exceedsBalance");
    },
    [t]
  );

  const confirmAmount = useCallback(() => {
    const amount = resolveAmount();
    try {
      CardRefundPolicy.assertRefundAmount(amount, detectedWallet || {});
    } catch (err) {
      setError(refundAmountError(err));
      return;
    }
    clearError();
    setStep("print");
  }, [clearError, detectedWallet, refundAmountError, resolveAmount]);

  const confirmAndPrint = useCallback(
    async (input: CardRefundConfirmInput) => {
      const amount = resolveAmount();
      if (!detectedCard?.cardUid || !detectedWallet?.id) {
        setError("Card must be detected before printing");
        return;
      }
      if (!input.approverAuthorization?.trim()) {
        setError("Approver authorization is required");
        return;
      }
      if (!input.paymentMethodId?.trim()) {
        setError("Payment method is required");
        return;
      }
      try {
        CardRefundPolicy.assertRefundAmount(amount, detectedWallet);
      } catch (err) {
        setError(refundAmountError(err));
        return;
      }

      try {
        setIsLoading(true);
        clearError();
        const wallet = await guestWalletService.refundWallet(detectedWallet.id, {
          amount,
          paymentMethodId: input.paymentMethodId,
          posSessionId: input.posSessionId,
          locationId: input.locationId,
          reference: input.reference?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          approverAuthorization: input.approverAuthorization.trim(),
        });
        setDetectedWallet(wallet);
        const printed = {
          receiptId: `refund-${Date.now()}`,
          cardNumber: detectedCard.cardUid,
          customerName: wallet.guestName || customerName || undefined,
          amount,
          balanceAfter: wallet.balance,
          printedAt: new Date().toISOString(),
        };
        setReceipt(printed);
        return printed;
      } catch (err) {
        setError(refundAmountError(err));
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
      refundAmountError,
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
    maxRefundAmount,
    selectedAmount,
    customAmount,
    receipt,
    isLoading,
    error,
    setCardNumber,
    setSelectedAmount,
    setCustomAmount,
    goToStep,
    startRefundFromPrefill,
    detectCard,
    confirmAmount,
    confirmAndPrint,
    resetFlow,
    clearError,
  };
}
