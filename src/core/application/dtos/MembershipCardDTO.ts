import { MembershipCard } from "../../domain/entities/MembershipCard";

export interface MembershipCardTopupDTO {
  tenantId: string;
  amount: string;
  reference?: string;
}

export interface MembershipCardRefundDTO {
  tenantId: string;
  amount: string;
  reference?: string;
}

export interface MembershipCardBindDTO {
  tenantId: string;
  cardNumber: string;
}

export interface MembershipCardUnbindDTO {
  tenantId: string;
}

export interface MembershipCardCloseDTO {
  tenantId: string;
  reason?: string;
}

export interface MembershipCardActionResultDTO {
  card: MembershipCard;
  message?: string;
}
