import { IMembershipCardRepository } from "../../domain/repositories/IMembershipCardRepository";
import { MembershipCard } from "../../domain/entities/MembershipCard";
import {
  DetectMembershipCardDTO,
  DetectedMembershipCardDTO,
  MembershipCardActionResultDTO,
  MembershipCardBindDTO,
  MembershipCardCloseDTO,
  MembershipCardOperationRefundDTO,
  MembershipCardOperationTopupDTO,
  MembershipCardRefundAmountOptionDTO,
  MembershipCardRefundDTO,
  MembershipCardRefundReceiptDTO,
  MembershipCardTopupAmountOptionDTO,
  MembershipCardTopupDTO,
  MembershipCardTopupReceiptDTO,
  MembershipCardUnbindDTO,
  VerifyMembershipCardPinDTO,
  VerifyMembershipCardPinResultDTO,
} from "../dtos/MembershipCardDTO";
import { IMembershipCardService } from "../../domain/services/IMembershipCardService";
import { CardRefundPolicy } from "./CardRefundPolicy";
import { CardTopupPolicy } from "./CardTopupPolicy";

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

  async detectMembershipCard(
    payload: DetectMembershipCardDTO
  ): Promise<DetectedMembershipCardDTO> {
    if (!payload.cardNumber?.trim()) {
      throw new Error("Card number is required");
    }
    return this.membershipCardRepository.detectMembershipCard(payload);
  }

  async getTopupAmountOptions(): Promise<MembershipCardTopupAmountOptionDTO[]> {
    try {
      const options = await this.membershipCardRepository.getTopupAmountOptions();
      if (options.length > 0) return options;
    } catch {
      // Fall back to local defaults until backend publishes amount options.
    }
    return CardTopupPolicy.defaultAmountOptions();
  }

  async topupMembershipCardByNumber(
    payload: MembershipCardOperationTopupDTO
  ): Promise<MembershipCardActionResultDTO> {
    this.assertTenantId(payload.tenantId);
    if (!payload.cardNumber?.trim()) {
      throw new Error("Card number is required");
    }
    this.assertPositiveAmount(payload.amount, "Topup amount must be greater than zero");
    return this.membershipCardRepository.topupMembershipCardByNumber(payload);
  }

  async verifyMembershipCardPin(
    payload: VerifyMembershipCardPinDTO
  ): Promise<VerifyMembershipCardPinResultDTO> {
    if (!payload.cardNumber?.trim()) {
      throw new Error("Card number is required");
    }
    if (!payload.pin?.trim()) {
      throw new Error("PIN is required");
    }
    return this.membershipCardRepository.verifyMembershipCardPin(payload);
  }

  async getRefundAmountOptions(): Promise<MembershipCardRefundAmountOptionDTO[]> {
    try {
      const options = await this.membershipCardRepository.getRefundAmountOptions();
      if (options.length > 0) return options;
    } catch {
      // Fall back to local defaults until backend publishes amount options.
    }
    return CardRefundPolicy.defaultAmountOptions();
  }

  async refundMembershipCardByNumber(
    payload: MembershipCardOperationRefundDTO
  ): Promise<MembershipCardActionResultDTO> {
    this.assertTenantId(payload.tenantId);
    if (!payload.cardNumber?.trim()) {
      throw new Error("Card number is required");
    }
    if (!payload.pin?.trim()) {
      throw new Error("PIN is required");
    }
    this.assertPositiveAmount(payload.amount, "Refund amount must be greater than zero");
    return this.membershipCardRepository.refundMembershipCardByNumber(payload);
  }

  async createRefundReceipt(
    payload: MembershipCardOperationRefundDTO
  ): Promise<MembershipCardRefundReceiptDTO> {
    this.assertTenantId(payload.tenantId);
    if (!payload.cardNumber?.trim()) {
      throw new Error("Card number is required");
    }
    if (!payload.pin?.trim()) {
      throw new Error("PIN is required");
    }
    this.assertPositiveAmount(payload.amount, "Refund amount must be greater than zero");
    try {
      return await this.membershipCardRepository.createRefundReceipt(payload);
    } catch {
      const result = await this.refundMembershipCardByNumber(payload);
      return {
        receiptId: `local-${Date.now()}`,
        cardNumber: result.card.cardNumber,
        amount: payload.amount,
        balanceAfter: result.card.balance,
        printedAt: new Date().toISOString(),
      };
    }
  }

  async createTopupReceipt(
    payload: MembershipCardOperationTopupDTO
  ): Promise<MembershipCardTopupReceiptDTO> {
    this.assertTenantId(payload.tenantId);
    if (!payload.cardNumber?.trim()) {
      throw new Error("Card number is required");
    }
    this.assertPositiveAmount(payload.amount, "Topup amount must be greater than zero");
    try {
      return await this.membershipCardRepository.createTopupReceipt(payload);
    } catch {
      const result = await this.topupMembershipCardByNumber(payload);
      return {
        receiptId: `local-${Date.now()}`,
        cardNumber: result.card.cardNumber,
        amount: payload.amount,
        balanceAfter: result.card.balance,
        printedAt: new Date().toISOString(),
      };
    }
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
