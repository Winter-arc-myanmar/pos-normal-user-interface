import { useCallback, useEffect, useState } from "react";
import { MembershipCard } from "../../domain/entities/MembershipCard";
import {
  MembershipCardTopupAmountOptionDTO,
  MembershipCardTopupReceiptDTO,
} from "../../application/dtos/MembershipCardDTO";
import { IMembershipCardService } from "../../domain/services/IMembershipCardService";
import container from "../../infrastructure/di/container";

export type CardTopupStep = "menu" | "detect" | "amount" | "print";

export interface CardTopupPrefill {
  cardNumber: string;
  balance: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  tenantId?: string;
}

interface UseCardTopupFlowReturn {
  step: CardTopupStep;
  cardNumber: string;
  detectedCard: MembershipCard | null;
  customerName: string | null;
  customerPhone: string | null;
  amountOptions: MembershipCardTopupAmountOptionDTO[];
  selectedAmount: string;
  customAmount: string;
  receipt: MembershipCardTopupReceiptDTO | null;
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
  confirmAndPrint: (tenantId: string) => Promise<void>;
  resetFlow: () => void;
  clearError: () => void;
}

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useCardTopupFlow(): UseCardTopupFlowReturn {
  const membershipCardService = container.resolve<IMembershipCardService>(
    "membershipCardService"
  );

  const [step, setStep] = useState<CardTopupStep>("menu");
  const [cardNumber, setCardNumber] = useState("");
  const [detectedCard, setDetectedCard] = useState<MembershipCard | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [amountOptions, setAmountOptions] = useState<
    MembershipCardTopupAmountOptionDTO[]
  >([]);
  const [selectedAmount, setSelectedAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [receipt, setReceipt] = useState<MembershipCardTopupReceiptDTO | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        const options = await membershipCardService.getTopupAmountOptions();
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
    setStep("menu");
    setCardNumber("");
    setDetectedCard(null);
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
    setCustomerName(null);
    setCustomerPhone(null);
    setSelectedAmount("");
    setCustomAmount("");
    setReceipt(null);
    setStep("detect");
  }, []);

  const startTopupFromPrefill = useCallback((prefill: CardTopupPrefill) => {
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
      new MembershipCard({
        id: "",
        tenantId: prefill.tenantId || "",
        customerId: prefill.customerId || "",
        cardNumber: prefill.cardNumber,
        balance: prefill.balance || "0.0000",
        status: "BOUND",
      })
    );
    setStep("amount");
  }, [startTopup]);

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
      setStep("amount");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to detect membership card";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [cardNumber, clearError, membershipCardService]);

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
    async (tenantId: string) => {
      const amount = resolveAmount();
      if (!detectedCard?.cardNumber) {
        setError("Card must be detected before printing");
        return;
      }
      if (!tenantId?.trim()) {
        setError("Tenant is required");
        return;
      }
      if (parseAmount(amount) <= 0) {
        setError("Topup amount must be greater than zero");
        return;
      }

      try {
        setIsLoading(true);
        clearError();
        const result = await membershipCardService.createTopupReceipt({
          tenantId,
          cardNumber: detectedCard.cardNumber,
          amount,
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
      membershipCardService,
      resolveAmount,
    ]
  );

  return {
    step,
    cardNumber,
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
