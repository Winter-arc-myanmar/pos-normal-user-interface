import { IGuestWalletRepository } from "../../domain/repositories/IGuestWalletRepository";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
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
  GuestWalletSettlementBlocker,
  GuestWalletSettlementQuote,
} from "../../domain/entities/GuestWallet";

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  data?: T;
}

const unwrap = <T>(response: ApiEnvelope<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return unwrap((response as ApiEnvelope<T>).data as T);
  }
  return response as T;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asList = (response: unknown): Record<string, unknown>[] => {
  const value = unwrap(response as ApiEnvelope<unknown>);
  if (Array.isArray(value)) {
    return value
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }
  const record = asRecord(value);
  if (!record) return [];
  if (record.id) return [record];
  return [];
};

const toMeta = (response: unknown, fallbackLimit: number, count: number) => {
  const envelope = asRecord(response);
  const meta = asRecord(envelope?.meta);
  const page = Number(meta?.page || 1);
  const limit = Number(meta?.limit || fallbackLimit);
  const total = Number(meta?.total ?? count);
  const totalPages = Number(
    meta?.totalPages || Math.max(1, Math.ceil((total || 1) / (limit || 1)))
  );
  return { page, limit, total, totalPages };
};

const asText = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const asNullableText = (value: unknown): string | null =>
  value === null || value === undefined || value === "" ? null : String(value);

const toWallet = (item: Record<string, unknown>): GuestWallet =>
  new GuestWallet({
    id: asText(item.id),
    tenantId: asText(item.tenantId),
    walletNumber: asText(item.walletNumber),
    guestName: asText(item.guestName),
    guestPhone: asText(item.guestPhone),
    guestIdNumber: asNullableText(item.guestIdNumber),
    tierId: asText(item.tierId),
    tierNameSnapshot: asText(item.tierNameSnapshot),
    discountBpsSnapshot: Number(item.discountBpsSnapshot || 0),
    isPostpaidSnapshot: Boolean(item.isPostpaidSnapshot),
    preloadAmountSnapshot: asText(item.preloadAmountSnapshot ?? "0"),
    preloadFundingSnapshot: asText(item.preloadFundingSnapshot),
    expiresAt: asNullableText(item.expiresAt),
    balance: asText(item.balance ?? "0"),
    purchasedBalance: asText(item.purchasedBalance ?? "0"),
    grantedBalance: asText(item.grantedBalance ?? "0"),
    sequenceNo: Number(item.sequenceNo || 0),
    status: asText(item.status || "ACTIVE"),
    issuedAtLocationId: asText(item.issuedAtLocationId),
    issuedByUserId: asText(item.issuedByUserId),
    openedAt: asNullableText(item.openedAt),
    closedAt: asNullableText(item.closedAt),
    closedByUserId: asNullableText(item.closedByUserId),
    createdAt: asText(item.createdAt),
    updatedAt: asText(item.updatedAt),
  });

const toCard = (item: Record<string, unknown>): GuestCard => {
  const walletRecord = asRecord(item.wallet);
  return new GuestCard({
    id: asText(item.id),
    tenantId: asText(item.tenantId),
    walletId: asText(item.walletId),
    cardUid: asText(item.cardUid),
    label: asNullableText(item.label),
    roomNumber: asNullableText(item.roomNumber),
    status: asText(item.status || "ACTIVE"),
    issuedAt: asNullableText(item.issuedAt),
    issuedByUserId: asNullableText(item.issuedByUserId),
    deactivatedAt: asNullableText(item.deactivatedAt),
    replacedByCardId: asNullableText(item.replacedByCardId),
    createdAt: asText(item.createdAt),
    updatedAt: asText(item.updatedAt),
    wallet: walletRecord ? toWallet(walletRecord) : null,
  });
};

const toLedgerEntry = (item: Record<string, unknown>): GuestWalletLedgerEntry =>
  new GuestWalletLedgerEntry({
    id: asText(item.id),
    tenantId: asText(item.tenantId),
    walletId: asText(item.walletId),
    sequenceNo: Number(item.sequenceNo || 0),
    entryType: asText(item.entryType),
    amount: asText(item.amount ?? "0"),
    purchasedDelta: asText(item.purchasedDelta ?? "0"),
    grantedDelta: asText(item.grantedDelta ?? "0"),
    balanceAfter: asText(item.balanceAfter ?? "0"),
    guestCardId: asNullableText(item.guestCardId),
    locationId: asNullableText(item.locationId),
    posSessionId: asNullableText(item.posSessionId),
    staffUserId: asNullableText(item.staffUserId),
    approvedByUserId: asNullableText(item.approvedByUserId),
    sourceModule: asNullableText(item.sourceModule),
    sourceRecordId: asNullableText(item.sourceRecordId),
    correctsEntryId: asNullableText(item.correctsEntryId),
    reference: asNullableText(item.reference),
    idempotencyKey: asNullableText(item.idempotencyKey),
    businessDate: asNullableText(item.businessDate),
    notes: asNullableText(item.notes),
    createdAt: asText(item.createdAt),
  });

const toQuote = (item: Record<string, unknown>): GuestWalletSettlementQuote => {
  const blockers = Array.isArray(item.blockers)
    ? item.blockers
        .map((blocker) => asRecord(blocker))
        .filter((blocker): blocker is Record<string, unknown> => Boolean(blocker))
        .map(
          (blocker) =>
            new GuestWalletSettlementBlocker({
              type: asText(blocker.type),
              id: asText(blocker.id) || undefined,
              label: asText(blocker.label) || undefined,
            })
        )
    : [];
  return new GuestWalletSettlementQuote({
    walletId: asText(item.walletId),
    walletNumber: asText(item.walletNumber),
    guestName: asText(item.guestName),
    status: asText(item.status),
    balance: asText(item.balance ?? "0"),
    purchasedBalance: asText(item.purchasedBalance ?? "0"),
    grantedBalance: asText(item.grantedBalance ?? "0"),
    action: asText(item.action),
    refundable: asText(item.refundable ?? "0"),
    forfeitable: asText(item.forfeitable ?? "0"),
    collectable: asText(item.collectable ?? "0"),
    blockers,
  });
};

const toAudit = (value: unknown): GuestWalletAudit => {
  const record = asRecord(unwrap(value as never)) || asRecord(value) || {};
  return new GuestWalletAudit({
    walletId: asText(record.walletId || record.id) || undefined,
    storedBalance: asText(record.storedBalance || record.balance) || undefined,
    replayedBalance:
      asText(record.replayedBalance || record.computedBalance) || undefined,
    drifted:
      typeof record.drifted === "boolean"
        ? record.drifted
        : typeof record.hasDrift === "boolean"
          ? record.hasDrift
          : undefined,
    message: asText(record.message) || undefined,
  });
};

const requireWallet = (response: unknown): GuestWallet => {
  const record = asRecord(unwrap(response));
  if (!record) throw new Error("Wallet response is missing data");
  return toWallet(record);
};

const requireCard = (response: unknown): GuestCard => {
  const record = asRecord(unwrap(response));
  if (!record) throw new Error("Card response is missing data");
  return toCard(record);
};

const requireLedger = (response: unknown): GuestWalletLedgerEntry => {
  const record = asRecord(unwrap(response));
  if (!record) throw new Error("Ledger response is missing data");
  return toLedgerEntry(record);
};

const withApprover = (token: string) => ({
  headers: { "x-approver-authorization": token },
});

const withoutApprover = <T extends { approverAuthorization: string }>(
  payload: T
) => {
  const body = { ...payload };
  delete (body as { approverAuthorization?: string }).approverAuthorization;
  return body;
};

export class ApiGuestWalletRepository implements IGuestWalletRepository {
  constructor(private httpClient: HttpClient) {}

  async issueWallet(payload: IssueGuestWalletDTO): Promise<GuestWallet> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.CREATE,
      payload
    );
    return requireWallet(response);
  }

  async listWallets(
    params?: GuestWalletFilterDTO
  ): Promise<GuestWalletListResponseDTO> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.LIST,
      { params }
    );
    const wallets = asList(response).map(toWallet);
    const meta = toMeta(response, params?.limit || 10, wallets.length);
    return { wallets, ...meta };
  }

  async getWallet(id: string): Promise<GuestWallet> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.BY_ID(id)
    );
    return requireWallet(response);
  }

  async listWalletCards(id: string): Promise<GuestCard[]> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.CARDS(id)
    );
    return asList(response).map(toCard);
  }

  async listWalletLedger(
    id: string,
    params?: GuestWalletFilterDTO
  ): Promise<GuestWalletLedgerListResponseDTO> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.LEDGER(id),
      { params }
    );
    const entries = asList(response).map(toLedgerEntry);
    const meta = toMeta(response, params?.limit || 10, entries.length);
    return { entries, ...meta };
  }

  async auditWallet(id: string): Promise<GuestWalletAudit> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.AUDIT(id)
    );
    return toAudit(response);
  }

  async topUpWallet(
    id: string,
    payload: TopUpGuestWalletDTO
  ): Promise<GuestWalletLedgerEntry> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.TOP_UP(id),
      payload
    );
    return requireLedger(response);
  }

  async getSettlementQuote(id: string): Promise<GuestWalletSettlementQuote> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.SETTLEMENT_QUOTE(id)
    );
    const record = asRecord(unwrap(response));
    if (!record) throw new Error("Settlement quote is missing data");
    return toQuote(record);
  }

  async beginSettlement(id: string): Promise<GuestWallet> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.BEGIN_SETTLEMENT(id)
    );
    return requireWallet(response);
  }

  async cancelSettlement(id: string): Promise<GuestWallet> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.CANCEL_SETTLEMENT(id)
    );
    return requireWallet(response);
  }

  async settleWallet(
    id: string,
    payload: SettleGuestWalletDTO
  ): Promise<GuestWallet> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.SETTLE(id),
      withoutApprover(payload),
      withApprover(payload.approverAuthorization)
    );
    return requireWallet(response);
  }

  async refundWallet(
    id: string,
    payload: RefundGuestWalletDTO
  ): Promise<GuestWallet> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.REFUND(id),
      withoutApprover(payload),
      withApprover(payload.approverAuthorization)
    );
    return requireWallet(response);
  }

  async voidWallet(
    id: string,
    payload: VoidGuestWalletDTO
  ): Promise<GuestWallet> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_WALLETS.VOID(id),
      undefined,
      withApprover(payload.approverAuthorization)
    );
    return requireWallet(response);
  }

  async lookupCard(cardUid: string): Promise<GuestCard> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_CARDS.LOOKUP,
      { params: { cardUid } }
    );
    return requireCard(response);
  }

  async bindCard(payload: BindGuestCardDTO): Promise<GuestCard> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_CARDS.CREATE,
      payload
    );
    return requireCard(response);
  }

  async listCards(
    params?: GuestWalletFilterDTO
  ): Promise<GuestCardListResponseDTO> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_CARDS.LIST,
      { params }
    );
    const cards = asList(response).map(toCard);
    const meta = toMeta(response, params?.limit || 10, cards.length);
    return { cards, ...meta };
  }

  async getCard(id: string): Promise<GuestCard> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_CARDS.BY_ID(id)
    );
    return requireCard(response);
  }

  async unbindCard(id: string): Promise<GuestCard> {
    const response = await this.httpClient.delete<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_CARDS.DELETE(id)
    );
    return requireCard(response);
  }

  async reportCardLost(id: string): Promise<GuestCard> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_CARDS.REPORT_LOST(id)
    );
    return requireCard(response);
  }

  async replaceCard(
    id: string,
    payload: ReplaceGuestCardDTO
  ): Promise<GuestCard> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.GUEST_CARDS.REPLACE(id),
      payload
    );
    return requireCard(response);
  }
}
