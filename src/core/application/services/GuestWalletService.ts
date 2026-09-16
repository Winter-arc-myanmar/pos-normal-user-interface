import { IGuestWalletRepository } from "../../domain/repositories/IGuestWalletRepository";
import { IGuestWalletService } from "../../domain/services/IGuestWalletService";
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
} from "../dtos/GuestWalletDTO";
import {
  GuestCard,
  GuestWallet,
  GuestWalletAudit,
  GuestWalletLedgerEntry,
  GuestWalletSettlementQuote,
} from "../../domain/entities/GuestWallet";

const parseAmount = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const newIdempotencyKey = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export class GuestWalletService implements IGuestWalletService {
  constructor(private guestWalletRepository: IGuestWalletRepository) {}

  async issueWallet(payload: IssueGuestWalletDTO): Promise<GuestWallet> {
    if (!payload.tierId?.trim()) throw new Error("Tier is required");
    if (!payload.guestName?.trim()) throw new Error("Guest name is required");
    if (!payload.guestPhone?.trim()) throw new Error("Guest phone is required");
    if (!payload.locationId?.trim()) throw new Error("Location is required");
    if (!payload.posSessionId?.trim()) throw new Error("POS session is required");
    const cards = (payload.cards || []).filter((card) => card.cardUid?.trim());
    if (!cards.length) {
      throw new Error("At least one card UID is required");
    }
    if (!payload.payment?.paymentMethodId?.trim()) {
      throw new Error("Payment method is required");
    }
    if (parseAmount(payload.payment.amount) <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }
    return this.guestWalletRepository.issueWallet({
      ...payload,
      cards: cards.map((card) => ({
        cardUid: card.cardUid.trim(),
        label: card.label?.trim() || undefined,
        roomNumber: card.roomNumber?.trim() || undefined,
      })),
      idempotencyKey: payload.idempotencyKey || newIdempotencyKey(),
    });
  }

  async listWallets(
    params?: GuestWalletFilterDTO
  ): Promise<GuestWalletListResponseDTO> {
    return this.guestWalletRepository.listWallets(params);
  }

  async getWallet(id: string): Promise<GuestWallet> {
    this.assertId(id, "Invalid wallet ID");
    return this.guestWalletRepository.getWallet(id);
  }

  async listWalletCards(id: string): Promise<GuestCard[]> {
    this.assertId(id, "Invalid wallet ID");
    return this.guestWalletRepository.listWalletCards(id);
  }

  async listWalletLedger(
    id: string,
    params?: GuestWalletFilterDTO
  ): Promise<GuestWalletLedgerListResponseDTO> {
    this.assertId(id, "Invalid wallet ID");
    return this.guestWalletRepository.listWalletLedger(id, params);
  }

  async auditWallet(id: string): Promise<GuestWalletAudit> {
    this.assertId(id, "Invalid wallet ID");
    return this.guestWalletRepository.auditWallet(id);
  }

  async topUpWallet(
    id: string,
    payload: TopUpGuestWalletDTO
  ): Promise<GuestWalletLedgerEntry> {
    this.assertId(id, "Invalid wallet ID");
    if (parseAmount(payload.amount) <= 0) {
      throw new Error("Top-up amount must be greater than zero");
    }
    if (!payload.paymentMethodId?.trim()) {
      throw new Error("Payment method is required");
    }
    if (!payload.locationId?.trim()) throw new Error("Location is required");
    if (!payload.posSessionId?.trim()) throw new Error("POS session is required");
    return this.guestWalletRepository.topUpWallet(id, {
      ...payload,
      idempotencyKey: payload.idempotencyKey || newIdempotencyKey(),
    });
  }

  async getSettlementQuote(id: string): Promise<GuestWalletSettlementQuote> {
    this.assertId(id, "Invalid wallet ID");
    return this.guestWalletRepository.getSettlementQuote(id);
  }

  async beginSettlement(id: string): Promise<GuestWallet> {
    this.assertId(id, "Invalid wallet ID");
    return this.guestWalletRepository.beginSettlement(id);
  }

  async cancelSettlement(id: string): Promise<GuestWallet> {
    this.assertId(id, "Invalid wallet ID");
    return this.guestWalletRepository.cancelSettlement(id);
  }

  async settleWallet(
    id: string,
    payload: SettleGuestWalletDTO
  ): Promise<GuestWallet> {
    this.assertId(id, "Invalid wallet ID");
    this.assertApprover(payload.approverAuthorization);
    if (!payload.locationId?.trim()) throw new Error("Location is required");
    if (!payload.posSessionId?.trim()) throw new Error("POS session is required");
    return this.guestWalletRepository.settleWallet(id, {
      ...payload,
      idempotencyKey: payload.idempotencyKey || newIdempotencyKey(),
    });
  }

  async refundWallet(
    id: string,
    payload: RefundGuestWalletDTO
  ): Promise<GuestWallet> {
    this.assertId(id, "Invalid wallet ID");
    this.assertApprover(payload.approverAuthorization);
    if (parseAmount(payload.amount) <= 0) {
      throw new Error("Refund amount must be greater than zero");
    }
    if (!payload.paymentMethodId?.trim()) {
      throw new Error("Payment method is required");
    }
    if (!payload.locationId?.trim()) throw new Error("Location is required");
    if (!payload.posSessionId?.trim()) throw new Error("POS session is required");
    return this.guestWalletRepository.refundWallet(id, {
      ...payload,
      idempotencyKey: payload.idempotencyKey || newIdempotencyKey(),
    });
  }

  async voidWallet(
    id: string,
    payload: VoidGuestWalletDTO
  ): Promise<GuestWallet> {
    this.assertId(id, "Invalid wallet ID");
    this.assertApprover(payload.approverAuthorization);
    return this.guestWalletRepository.voidWallet(id, payload);
  }

  async lookupCard(cardUid: string): Promise<GuestCard> {
    if (!cardUid?.trim()) throw new Error("Card UID is required");
    return this.guestWalletRepository.lookupCard(cardUid.trim());
  }

  async bindCard(payload: BindGuestCardDTO): Promise<GuestCard> {
    if (!payload.walletId?.trim()) throw new Error("Wallet is required");
    if (!payload.cardUid?.trim()) throw new Error("Card UID is required");
    return this.guestWalletRepository.bindCard(payload);
  }

  async unbindCard(id: string): Promise<GuestCard> {
    this.assertId(id, "Invalid card ID");
    return this.guestWalletRepository.unbindCard(id);
  }

  async reportCardLost(id: string): Promise<GuestCard> {
    this.assertId(id, "Invalid card ID");
    return this.guestWalletRepository.reportCardLost(id);
  }

  async replaceCard(
    id: string,
    payload: ReplaceGuestCardDTO
  ): Promise<GuestCard> {
    this.assertId(id, "Invalid card ID");
    if (!payload.newCardUid?.trim()) throw new Error("New card UID is required");
    return this.guestWalletRepository.replaceCard(id, payload);
  }

  async listCards(
    params?: GuestWalletFilterDTO
  ): Promise<GuestCardListResponseDTO> {
    return this.guestWalletRepository.listCards(params);
  }

  async getCard(id: string): Promise<GuestCard> {
    this.assertId(id, "Invalid card ID");
    return this.guestWalletRepository.getCard(id);
  }

  private assertId(id: string, message: string): void {
    if (!id?.trim()) throw new Error(message);
  }

  private assertApprover(value: string): void {
    if (!value?.trim()) {
      throw new Error("Approver authorization is required");
    }
  }
}
