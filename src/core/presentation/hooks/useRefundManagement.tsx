import { useCallback, useState } from "react";
import {
  CreateRefundDTO,
  RefundListQueryDTO,
} from "../../application/dtos/RefundDTO";
import { SalesRefund } from "../../domain/entities/SalesRefund";
import { IRefundService } from "../../domain/services/IRefundService";
import container from "../../infrastructure/di/container";

export function useRefundManagement() {
  const refundService = container.resolve<IRefundService>("refundService");
  const [refunds, setRefunds] = useState<SalesRefund[]>([]);
  const [selectedRefund, setSelectedRefund] = useState<SalesRefund | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRefundsForOrder = useCallback(
    async (salesOrderId: string, params?: RefundListQueryDTO) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await refundService.listRefundsForOrder(salesOrderId, params);
        setRefunds(result.refunds);
        return result;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Failed to load refunds";
        setError(message);
        throw caught;
      } finally {
        setIsLoading(false);
      }
    },
    [refundService]
  );

  const getRefundById = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const refund = await refundService.getRefundById(id);
        setSelectedRefund(refund);
        return refund;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Failed to load refund";
        setError(message);
        throw caught;
      } finally {
        setIsLoading(false);
      }
    },
    [refundService]
  );

  const createRefund = useCallback(
    async (payload: CreateRefundDTO) => {
      setIsLoading(true);
      setError(null);
      try {
        const created = await refundService.createRefund(payload);
        setSelectedRefund(created);
        setRefunds((current) => [created, ...current.filter((item) => item.returnId !== created.returnId)]);
        return created;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Failed to process refund";
        setError(message);
        throw caught;
      } finally {
        setIsLoading(false);
      }
    },
    [refundService]
  );

  return {
    refunds,
    selectedRefund,
    isLoading,
    error,
    listRefundsForOrder,
    getRefundById,
    createRefund,
    clearSelection: () => setSelectedRefund(null),
  };
}
