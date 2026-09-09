import { useCallback, useState } from "react";
import { MembershipCard } from "../../domain/entities/MembershipCard";
import {
  MembershipCardBindDTO,
  MembershipCardCloseDTO,
  MembershipCardRefundDTO,
  MembershipCardTopupDTO,
  MembershipCardUnbindDTO,
} from "../../application/dtos/MembershipCardDTO";
import { IMembershipCardService } from "../../domain/services/IMembershipCardService";
import container from "../../infrastructure/di/container";

interface UseMembershipCardManagementReturn {
  membershipCard: MembershipCard | null;
  isLoading: boolean;
  error: string | null;
  loadMembershipCard: (customerId: string) => Promise<MembershipCard | null>;
  topupMembershipCard: (
    customerId: string,
    payload: MembershipCardTopupDTO
  ) => Promise<MembershipCard>;
  refundMembershipCard: (
    customerId: string,
    payload: MembershipCardRefundDTO
  ) => Promise<MembershipCard>;
  bindMembershipCard: (
    customerId: string,
    payload: MembershipCardBindDTO
  ) => Promise<MembershipCard>;
  unbindMembershipCard: (
    customerId: string,
    payload: MembershipCardUnbindDTO
  ) => Promise<MembershipCard>;
  closeMembershipCard: (
    customerId: string,
    payload: MembershipCardCloseDTO
  ) => Promise<MembershipCard>;
  clearMembershipCard: () => void;
  clearError: () => void;
}

export function useMembershipCardManagement(): UseMembershipCardManagementReturn {
  const [membershipCard, setMembershipCard] = useState<MembershipCard | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const membershipCardService = container.resolve<IMembershipCardService>(
    "membershipCardService"
  );

  const clearError = useCallback(() => setError(null), []);

  const clearMembershipCard = useCallback(() => {
    setMembershipCard(null);
  }, []);

  const loadMembershipCard = useCallback(
    async (customerId: string) => {
      try {
        setIsLoading(true);
        clearError();
        const card = await membershipCardService.getMembershipCard(customerId);
        setMembershipCard(card);
        return card;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load membership card";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, membershipCardService]
  );

  const runAction = useCallback(
    async (
      action: () => Promise<{ card: MembershipCard; message?: string }>
    ) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await action();
        setMembershipCard(result.card);
        return result.card;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Membership card action failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError]
  );

  const topupMembershipCard = useCallback(
    async (customerId: string, payload: MembershipCardTopupDTO) =>
      runAction(() =>
        membershipCardService.topupMembershipCard(customerId, payload)
      ),
    [membershipCardService, runAction]
  );

  const refundMembershipCard = useCallback(
    async (customerId: string, payload: MembershipCardRefundDTO) =>
      runAction(() =>
        membershipCardService.refundMembershipCard(customerId, payload)
      ),
    [membershipCardService, runAction]
  );

  const bindMembershipCard = useCallback(
    async (customerId: string, payload: MembershipCardBindDTO) =>
      runAction(() =>
        membershipCardService.bindMembershipCard(customerId, payload)
      ),
    [membershipCardService, runAction]
  );

  const unbindMembershipCard = useCallback(
    async (customerId: string, payload: MembershipCardUnbindDTO) =>
      runAction(() =>
        membershipCardService.unbindMembershipCard(customerId, payload)
      ),
    [membershipCardService, runAction]
  );

  const closeMembershipCard = useCallback(
    async (customerId: string, payload: MembershipCardCloseDTO) =>
      runAction(() =>
        membershipCardService.closeMembershipCard(customerId, payload)
      ),
    [membershipCardService, runAction]
  );

  return {
    membershipCard,
    isLoading,
    error,
    loadMembershipCard,
    topupMembershipCard,
    refundMembershipCard,
    bindMembershipCard,
    unbindMembershipCard,
    closeMembershipCard,
    clearMembershipCard,
    clearError,
  };
}
