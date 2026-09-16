import {
  BindGuestCardDTO,
  GuestCardListResponseDTO,
  GuestWalletFilterDTO,
  GuestWalletLedgerListResponseDTO,
  GuestWalletListResponseDTO,
  IssueGuestWalletDTO,
  RefundGuestWalletDTO,
  ReplaceGuestCardDTO,
  SettleGuestWalletDTO,
  TopUpGuestWalletDTO,
  VoidGuestWalletDTO,
} from "../../application/dtos/GuestWalletDTO";
import {
  GuestCard,
  GuestWallet,
  GuestWalletAudit,
  GuestWalletLedgerEntry,
  GuestWalletSettlementQuote,
} from "../entities/GuestWallet";

export interface IGuestWalletService {
  issueWallet(payload: IssueGuestWalletDTO): Promise<GuestWallet>;
  listWallets(params?: GuestWalletFilterDTO): Promise<GuestWalletListResponseDTO>;
  getWallet(id: string): Promise<GuestWallet>;
  listWalletCards(id: string): Promise<GuestCard[]>;
  listWalletLedger(
    id: string,
    params?: GuestWalletFilterDTO
  ): Promise<GuestWalletLedgerListResponseDTO>;
  auditWallet(id: string): Promise<GuestWalletAudit>;
  topUpWallet(
    id: string,
    payload: TopUpGuestWalletDTO
  ): Promise<GuestWalletLedgerEntry>;
  getSettlementQuote(id: string): Promise<GuestWalletSettlementQuote>;
  beginSettlement(id: string): Promise<GuestWallet>;
  cancelSettlement(id: string): Promise<GuestWallet>;
  settleWallet(id: string, payload: SettleGuestWalletDTO): Promise<GuestWallet>;
  refundWallet(id: string, payload: RefundGuestWalletDTO): Promise<GuestWallet>;
  voidWallet(id: string, payload: VoidGuestWalletDTO): Promise<GuestWallet>;
  lookupCard(cardUid: string): Promise<GuestCard>;
  bindCard(payload: BindGuestCardDTO): Promise<GuestCard>;
  unbindCard(id: string): Promise<GuestCard>;
  reportCardLost(id: string): Promise<GuestCard>;
  replaceCard(id: string, payload: ReplaceGuestCardDTO): Promise<GuestCard>;
  listCards(params?: GuestWalletFilterDTO): Promise<GuestCardListResponseDTO>;
  getCard(id: string): Promise<GuestCard>;
}
