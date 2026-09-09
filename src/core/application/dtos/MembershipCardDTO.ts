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

export interface DetectMembershipCardDTO {
  cardNumber: string;
}

export interface DetectedMembershipCardDTO {
  card: MembershipCard;
  customerName?: string;
  customerPhone?: string;
}

export interface MembershipCardOperationTopupDTO {
  tenantId: string;
  cardNumber: string;
  amount: string;
  reference?: string;
}

export interface MembershipCardTopupAmountOptionDTO {
  id: string;
  label: string;
  amount: string;
}

export interface MembershipCardTopupReceiptDTO {
  receiptId: string;
  cardNumber: string;
  customerName?: string;
  amount: string;
  balanceAfter: string;
  printedAt: string;
}

export interface VerifyMembershipCardPinDTO {
  cardNumber: string;
  pin: string;
}

export interface VerifyMembershipCardPinResultDTO {
  verified: boolean;
}

export interface MembershipCardOperationRefundDTO {
  tenantId: string;
  cardNumber: string;
  amount: string;
  pin: string;
  reference?: string;
}

export interface MembershipCardRefundAmountOptionDTO {
  id: string;
  label: string;
  amount: string;
}

export interface MembershipCardRefundReceiptDTO {
  receiptId: string;
  cardNumber: string;
  customerName?: string;
  amount: string;
  balanceAfter: string;
  printedAt: string;
}
