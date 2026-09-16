import {
  GuestWallet,
  GuestWalletLedgerEntry,
} from "../../domain/entities/GuestWallet";

export interface GuestWalletFilterDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GuestWalletListResponseDTO {
  wallets: GuestWallet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GuestWalletLedgerListResponseDTO {
  entries: GuestWalletLedgerEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IssueGuestWalletCardDTO {
  cardUid: string;
  label?: string;
  roomNumber?: string;
}

export interface IssueGuestWalletPaymentDTO {
  paymentMethodId: string;
  amount: string;
  reference?: string;
}

export interface IssueGuestWalletDTO {
  tierId: string;
  guestName: string;
  guestPhone: string;
  guestIdNumber?: string;
  locationId: string;
  posSessionId: string;
  cards: IssueGuestWalletCardDTO[];
  payment: IssueGuestWalletPaymentDTO;
  idempotencyKey?: string;
}

export interface TopUpGuestWalletDTO {
  amount: string;
  paymentMethodId: string;
  posSessionId: string;
  locationId: string;
  reference?: string;
  guestCardId?: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface RefundGuestWalletDTO {
  amount: string;
  paymentMethodId: string;
  posSessionId: string;
  locationId: string;
  reference?: string;
  idempotencyKey?: string;
  notes?: string;
  approverAuthorization: string;
}

export interface SettleGuestWalletRefundDTO {
  paymentMethodId: string;
  reference?: string;
}

export interface SettleGuestWalletCollectDTO {
  paymentMethodId: string;
  reference?: string;
  amount: string;
}

export interface SettleGuestWalletDTO {
  posSessionId: string;
  locationId: string;
  refund?: SettleGuestWalletRefundDTO;
  collect?: SettleGuestWalletCollectDTO;
  idempotencyKey?: string;
  notes?: string;
  approverAuthorization: string;
}

export interface VoidGuestWalletDTO {
  approverAuthorization: string;
}

export interface BindGuestCardDTO {
  walletId: string;
  cardUid: string;
  label?: string;
  roomNumber?: string;
}

export interface ReplaceGuestCardDTO {
  newCardUid: string;
  label?: string;
  roomNumber?: string;
}
