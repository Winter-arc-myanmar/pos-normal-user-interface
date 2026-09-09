import { IMembershipCardRepository } from "../../domain/repositories/IMembershipCardRepository";
import { MembershipCard } from "../../domain/entities/MembershipCard";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
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

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
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

const toMembershipCard = (item: Record<string, unknown>): MembershipCard =>
  new MembershipCard({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    customerId: String(item.customerId || ""),
    cardNumber: String(item.cardNumber || ""),
    balance: String(item.balance ?? "0.0000"),
    status: String(item.status || "UNBOUND"),
    boundAt: item.boundAt ? String(item.boundAt) : null,
    closedAt: item.closedAt ? String(item.closedAt) : null,
    createdAt: String(item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
  });

const toActionResult = (
  response: unknown,
  envelope?: ApiEnvelope<unknown>
): MembershipCardActionResultDTO => {
  const value = unwrap(response);
  const record = asRecord(value);
  const cardRecord = asRecord(record?.card) || record;
  if (!cardRecord) {
    throw new Error("Membership card response is missing card data");
  }
  return {
    card: toMembershipCard(cardRecord),
    message:
      envelope && typeof envelope.message === "string"
        ? envelope.message
        : undefined,
  };
};

export class ApiMembershipCardRepository implements IMembershipCardRepository {
  constructor(private httpClient: HttpClient) {}

  async getMembershipCard(customerId: string): Promise<MembershipCard | null> {
    try {
      const response = await this.httpClient.get<
        ApiEnvelope<Record<string, unknown>>
      >(API_ENDPOINTS.CUSTOMERS.MEMBERSHIP_CARD(customerId).GET);
      const record = asRecord(unwrap(response));
      if (!record) return null;
      return toMembershipCard(record);
    } catch (error) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async topupMembershipCard(
    customerId: string,
    payload: MembershipCardTopupDTO
  ): Promise<MembershipCardActionResultDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.CUSTOMERS.MEMBERSHIP_CARD(customerId).TOPUP,
      payload
    );
    return toActionResult(response, response);
  }

  async refundMembershipCard(
    customerId: string,
    payload: MembershipCardRefundDTO
  ): Promise<MembershipCardActionResultDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.CUSTOMERS.MEMBERSHIP_CARD(customerId).REFUND,
      payload
    );
    return toActionResult(response, response);
  }

  async bindMembershipCard(
    customerId: string,
    payload: MembershipCardBindDTO
  ): Promise<MembershipCardActionResultDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.CUSTOMERS.MEMBERSHIP_CARD(customerId).BIND,
      payload
    );
    return toActionResult(response, response);
  }

  async unbindMembershipCard(
    customerId: string,
    payload: MembershipCardUnbindDTO
  ): Promise<MembershipCardActionResultDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.CUSTOMERS.MEMBERSHIP_CARD(customerId).UNBIND,
      payload
    );
    return toActionResult(response, response);
  }

  async closeMembershipCard(
    customerId: string,
    payload: MembershipCardCloseDTO
  ): Promise<MembershipCardActionResultDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.CUSTOMERS.MEMBERSHIP_CARD(customerId).CLOSE,
      payload
    );
    return toActionResult(response, response);
  }

  async detectMembershipCard(
    payload: DetectMembershipCardDTO
  ): Promise<DetectedMembershipCardDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.MEMBERSHIP_CARDS.DETECT,
      payload
    );
    const value = unwrap(response);
    const record = asRecord(value);
    const cardRecord = asRecord(record?.card) || record;
    if (!cardRecord) {
      throw new Error("Card detection response is missing card data");
    }
    return {
      card: toMembershipCard(cardRecord),
      customerName:
        typeof record?.customerName === "string" ? record.customerName : undefined,
      customerPhone:
        typeof record?.customerPhone === "string" ? record.customerPhone : undefined,
    };
  }

  async getTopupAmountOptions(): Promise<MembershipCardTopupAmountOptionDTO[]> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.MEMBERSHIP_CARDS.TOPUP_AMOUNT_OPTIONS
    );
    const value = unwrap(response);
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        id: String(item.id || item.amount || ""),
        label: String(item.label || item.amount || ""),
        amount: String(item.amount || "0.0000"),
      }))
      .filter((item) => item.id && item.amount);
  }

  async topupMembershipCardByNumber(
    payload: MembershipCardOperationTopupDTO
  ): Promise<MembershipCardActionResultDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.MEMBERSHIP_CARDS.TOPUP,
      payload
    );
    return toActionResult(response, response);
  }

  async verifyMembershipCardPin(
    payload: VerifyMembershipCardPinDTO
  ): Promise<VerifyMembershipCardPinResultDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.MEMBERSHIP_CARDS.VERIFY_PIN,
      payload
    );
    const value = unwrap(response);
    const record = asRecord(value);
    if (record && typeof record.verified === "boolean") {
      if (!record.verified) {
        throw new Error("Invalid card PIN");
      }
      return { verified: true };
    }
    return { verified: true };
  }

  async getRefundAmountOptions(): Promise<MembershipCardRefundAmountOptionDTO[]> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.MEMBERSHIP_CARDS.REFUND_AMOUNT_OPTIONS
    );
    const value = unwrap(response);
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        id: String(item.id || item.amount || ""),
        label: String(item.label || item.amount || ""),
        amount: String(item.amount || "0.0000"),
      }))
      .filter((item) => item.id && item.amount);
  }

  async refundMembershipCardByNumber(
    payload: MembershipCardOperationRefundDTO
  ): Promise<MembershipCardActionResultDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.MEMBERSHIP_CARDS.REFUND,
      payload
    );
    return toActionResult(response, response);
  }

  async createRefundReceipt(
    payload: MembershipCardOperationRefundDTO
  ): Promise<MembershipCardRefundReceiptDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.MEMBERSHIP_CARDS.REFUND_RECEIPT,
      payload
    );
    const value = unwrap(response);
    const record = asRecord(value);
    if (!record) {
      throw new Error("Refund receipt response is missing data");
    }
    return {
      receiptId: String(record.receiptId || record.id || ""),
      cardNumber: String(record.cardNumber || payload.cardNumber),
      customerName:
        typeof record.customerName === "string" ? record.customerName : undefined,
      amount: String(record.amount || payload.amount),
      balanceAfter: String(record.balanceAfter || record.balance || "0.0000"),
      printedAt: String(record.printedAt || new Date().toISOString()),
    };
  }

  async createTopupReceipt(
    payload: MembershipCardOperationTopupDTO
  ): Promise<MembershipCardTopupReceiptDTO> {
    const response = await this.httpClient.post<ApiEnvelope<unknown>>(
      API_ENDPOINTS.MEMBERSHIP_CARDS.TOPUP_RECEIPT,
      payload
    );
    const value = unwrap(response);
    const record = asRecord(value);
    if (!record) {
      throw new Error("Topup receipt response is missing data");
    }
    return {
      receiptId: String(record.receiptId || record.id || ""),
      cardNumber: String(record.cardNumber || payload.cardNumber),
      customerName:
        typeof record.customerName === "string" ? record.customerName : undefined,
      amount: String(record.amount || payload.amount),
      balanceAfter: String(record.balanceAfter || record.balance || "0.0000"),
      printedAt: String(record.printedAt || new Date().toISOString()),
    };
  }

  private isNotFound(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const status = (error as { response?: { status?: number } }).response?.status;
    return status === 404;
  }
}
