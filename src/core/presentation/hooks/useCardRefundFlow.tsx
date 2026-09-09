import { useCallback, useEffect, useState } from "react";
import { MembershipCard } from "../../domain/entities/MembershipCard";
import {
  MembershipCardRefundAmountOptionDTO,
  MembershipCardRefundReceiptDTO,
} from "../../application/dtos/MembershipCardDTO";
import { IMembershipCardService } from "../../domain/services/IMembershipCardService";
import container from "../../infrastructure/di/container";

export type CardRefundStep = "detect" | "pin" | "amount" | "print";

export interface CardRefundPrefill {
  cardNumber: string;
  balance: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  tenantId?: string;
}

interface UseCardRefundFlowReturn {
  step: CardRefundStep;
  cardNumber: string;
  pin: string;
  pinVerified: boolean;
  detectedCard: MembershipCard | null;
  customerName: string | null;
  customerPhone: string | null;
  amountOptions: MembershipCardRefundAmountOptionDTO[];
  selectedAmount: string;
  customAmount: string;
  receipt: MembershipCardRefundReceiptDTO | null;
  isLoading: boolean;
  error: string | null;
  setCardNumber: (value: string) => void;
  setPin: (value: string) => void;
  setSelectedAmount: (value: string) => void;
  setCustomAmount: (value: string) => void;
  goToStep: (step: CardRefundStep) => void;
  startRefundFromPrefill: (prefill: CardRefundPrefill) => void;
  detectCard: () => Promise<void>;
  verifyPin: () => Promise<void>;
  confirmAmount: () => void;
  confirmAndPrint: (tenantId: string) => Promise<void>;
  resetFlow: () => void;
  clearError: () => void;
}

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useCardRefundFlow(): UseCardRefundFlowReturn {
  const membershipCardService = container.resolve<IMembershipCardService>(
    "membershipCardService"
  );

  const [step, setStep] = useState<CardRefundStep>("detect");
  const [cardNumber, setCardNumber] = useState("");
  const [pin, setPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [detectedCard, setDetectedCard] = useState<MembershipCard | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [amountOptions, setAmountOptions] = useState<
    MembershipCardRefundAmountOptionDTO[]
  >([]);
  const [selectedAmount, setSelectedAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [receipt, setReceipt] = useState<MembershipCardRefundReceiptDTO | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        const options = await membershipCardService.getRefundAmountOptions();
        if (!cancelled) setAmountOptions(options);
      } catch {
        if (!cancelled) setAmountOptions([]);
      }
    };
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [membershipCardService]);

  const resetFlow = useCallback(() => {
    setStep("detect");
    setCardNumber("");
    setPin("");
    setPinVerified(false);
    setDetectedCard(null);
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

  const startRefundFromPrefill = useCallback((prefill: CardRefundPrefill) => {
    if (!prefill.cardNumber?.trim()) {
      resetFlow();
      return;
    }

    setError(null);
    setReceipt(null);
    setPin("");
    setPinVerified(false);
    setSelectedAmount("");
    setCustomAmount("");
    setCardNumber(prefill.cardNumber);
    setCustomerName(prefill.customerName || null);
    setCustomerPhone(prefill.customerPhone || null);
    setDetectedCard(
      new MembershipCard({
        id: "",
        tenantId: prefill.tenantId || "",
        customerId: prefill.customerId || "",
        cardNumber: prefill.cardNumber,
        balance: prefill.balance || "0.0000",
        status: "BOUND",
      })
    );
    setStep("pin");
  }, [resetFlow]);

  const detectCard = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();
      const result = await membershipCardService.detectMembershipCard({
        cardNumber: cardNumber.trim(),
      });
      setDetectedCard(result.card);
      setCustomerName(result.customerName || null);
      setCustomerPhone(result.customerPhone || null);
      setCardNumber(result.card.cardNumber);
      setPin("");
      setPinVerified(false);
      setStep("pin");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to detect membership card";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [cardNumber, clearError, membershipCardService]);

  const verifyPin = useCallback(async () => {
    if (!detectedCard?.cardNumber) {
      setError("Card must be detected before verifying PIN");
      return;
    }
    if (!pin.trim()) {
      setError("PIN is required");
      return;
    }

    try {
      setIsLoading(true);
      clearError();
      await membershipCardService.verifyMembershipCardPin({
        cardNumber: detectedCard.cardNumber,
        pin: pin.trim(),
      });
      setPinVerified(true);
      setStep("amount");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to verify card PIN";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [clearError, detectedCard, membershipCardService, pin]);

  const resolveAmount = useCallback((): string => {
    if (selectedAmount) return selectedAmount;
    return customAmount.trim();
  }, [customAmount, selectedAmount]);

  const confirmAmount = useCallback(() => {
    const amount = resolveAmount();
    if (parseAmount(amount) <= 0) {
      setError("Refund amount must be greater than zero");
      return;
    }
    if (detectedCard && parseAmount(amount) > parseAmount(detectedCard.balance)) {
      setError("Refund amount cannot exceed card balance");
      return;
    }
    clearError();
    setStep("print");
  }, [clearError, detectedCard, resolveAmount]);

  const confirmAndPrint = useCallback(
    async (tenantId: string) => {
      const amount = resolveAmount();
      if (!detectedCard?.cardNumber) {
        setError("Card must be detected before printing");
        return;
      }
      if (!pinVerified || !pin.trim()) {
        setError("PIN must be verified before printing");
        return;
      }
      if (!tenantId?.trim()) {
        setError("Tenant is required");
        return;
      }
      if (parseAmount(amount) <= 0) {
        setError("Refund amount must be greater than zero");
        return;
      }

      try {
        setIsLoading(true);
        clearError();
        const result = await membershipCardService.createRefundReceipt({
          tenantId,
          cardNumber: detectedCard.cardNumber,
          amount,
          pin: pin.trim(),
        });
        setReceipt({
          ...result,
          customerName: result.customerName || customerName || undefined,
        });
        setDetectedCard((current) =>
          current
            ? new MembershipCard({
                ...current,
                balance: result.balanceAfter,
              })
            : current
        );
        window.print();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to complete card refund";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      clearError,
      customerName,
      detectedCard,
      membershipCardService,
      pin,
      pinVerified,
      resolveAmount,
    ]
  );

  return {
    step,
    cardNumber,
    pin,
    pinVerified,
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
    clearError,
  };
}
