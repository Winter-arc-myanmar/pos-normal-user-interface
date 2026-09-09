import { MembershipCard } from "../entities/MembershipCard";
import {
  MembershipCardActionResultDTO,
  MembershipCardBindDTO,
  MembershipCardCloseDTO,
  MembershipCardRefundDTO,
  MembershipCardTopupDTO,
  MembershipCardUnbindDTO,
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
}
