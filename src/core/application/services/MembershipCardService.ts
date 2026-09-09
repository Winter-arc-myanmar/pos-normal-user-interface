import { IMembershipCardRepository } from "../../domain/repositories/IMembershipCardRepository";
import { MembershipCard } from "../../domain/entities/MembershipCard";
import {
  MembershipCardActionResultDTO,
  MembershipCardBindDTO,
  MembershipCardCloseDTO,
  MembershipCardRefundDTO,
  MembershipCardTopupDTO,
  MembershipCardUnbindDTO,
} from "../dtos/MembershipCardDTO";
import { IMembershipCardService } from "../../domain/services/IMembershipCardService";

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export class MembershipCardService implements IMembershipCardService {
  constructor(private membershipCardRepository: IMembershipCardRepository) {}

  async getMembershipCard(customerId: string): Promise<MembershipCard | null> {
    if (!customerId) {
      throw new Error("Invalid customer ID");
    }
    return this.membershipCardRepository.getMembershipCard(customerId);
  }

  async topupMembershipCard(
    customerId: string,
    payload: MembershipCardTopupDTO
  ): Promise<MembershipCardActionResultDTO> {
    this.assertCustomerId(customerId);
    this.assertTenantId(payload.tenantId);
    this.assertPositiveAmount(payload.amount, "Topup amount must be greater than zero");
    return this.membershipCardRepository.topupMembershipCard(customerId, payload);
  }

  async refundMembershipCard(
    customerId: string,
    payload: MembershipCardRefundDTO
  ): Promise<MembershipCardActionResultDTO> {
    this.assertCustomerId(customerId);
    this.assertTenantId(payload.tenantId);
    this.assertPositiveAmount(payload.amount, "Refund amount must be greater than zero");
    return this.membershipCardRepository.refundMembershipCard(customerId, payload);
  }

  async bindMembershipCard(
    customerId: string,
    payload: MembershipCardBindDTO
  ): Promise<MembershipCardActionResultDTO> {
    this.assertCustomerId(customerId);
    this.assertTenantId(payload.tenantId);
    if (!payload.cardNumber?.trim()) {
      throw new Error("Card number is required");
    }
    return this.membershipCardRepository.bindMembershipCard(customerId, payload);
  }

  async unbindMembershipCard(
    customerId: string,
    payload: MembershipCardUnbindDTO
  ): Promise<MembershipCardActionResultDTO> {
    this.assertCustomerId(customerId);
    this.assertTenantId(payload.tenantId);
    return this.membershipCardRepository.unbindMembershipCard(customerId, payload);
  }

  async closeMembershipCard(
    customerId: string,
    payload: MembershipCardCloseDTO
  ): Promise<MembershipCardActionResultDTO> {
    this.assertCustomerId(customerId);
    this.assertTenantId(payload.tenantId);
    return this.membershipCardRepository.closeMembershipCard(customerId, payload);
  }

  private assertCustomerId(customerId: string): void {
    if (!customerId) {
      throw new Error("Invalid customer ID");
    }
  }

  private assertTenantId(tenantId: string): void {
    if (!tenantId?.trim()) {
      throw new Error("Tenant is required");
    }
  }

  private assertPositiveAmount(amount: string, message: string): void {
    if (parseAmount(amount) <= 0) {
      throw new Error(message);
    }
  }
}
