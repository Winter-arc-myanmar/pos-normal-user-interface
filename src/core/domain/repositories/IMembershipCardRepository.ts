import { MembershipCard } from "../entities/MembershipCard";
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
} from "../../application/dtos/MembershipCardDTO";

export interface IMembershipCardRepository {
  getMembershipCard(customerId: string): Promise<MembershipCard | null>;
  topupMembershipCard(
    customerId: string,
    payload: MembershipCardTopupDTO
  ): Promise<MembershipCardActionResultDTO>;
  refundMembershipCard(
    customerId: string,
    payload: MembershipCardRefundDTO
  ): Promise<MembershipCardActionResultDTO>;
  bindMembershipCard(
    customerId: string,
    payload: MembershipCardBindDTO
  ): Promise<MembershipCardActionResultDTO>;
  unbindMembershipCard(
    customerId: string,
    payload: MembershipCardUnbindDTO
  ): Promise<MembershipCardActionResultDTO>;
  closeMembershipCard(
    customerId: string,
    payload: MembershipCardCloseDTO
  ): Promise<MembershipCardActionResultDTO>;
  detectMembershipCard(
    payload: DetectMembershipCardDTO
  ): Promise<DetectedMembershipCardDTO>;
  getTopupAmountOptions(): Promise<MembershipCardTopupAmountOptionDTO[]>;
  topupMembershipCardByNumber(
    payload: MembershipCardOperationTopupDTO
  ): Promise<MembershipCardActionResultDTO>;
  createTopupReceipt(
    payload: MembershipCardOperationTopupDTO
  ): Promise<MembershipCardTopupReceiptDTO>;
  verifyMembershipCardPin(
    payload: VerifyMembershipCardPinDTO
  ): Promise<VerifyMembershipCardPinResultDTO>;
  getRefundAmountOptions(): Promise<MembershipCardRefundAmountOptionDTO[]>;
  refundMembershipCardByNumber(
    payload: MembershipCardOperationRefundDTO
  ): Promise<MembershipCardActionResultDTO>;
  createRefundReceipt(
    payload: MembershipCardOperationRefundDTO
  ): Promise<MembershipCardRefundReceiptDTO>;
}
