import { IMembershipCardRepository } from "../../domain/repositories/IMembershipCardRepository";
import { MembershipCard } from "../../domain/entities/MembershipCard";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import {
  MembershipCardActionResultDTO,
  MembershipCardBindDTO,
  MembershipCardCloseDTO,
  MembershipCardRefundDTO,
  MembershipCardTopupDTO,
  MembershipCardUnbindDTO,
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

  private isNotFound(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const status = (error as { response?: { status?: number } }).response?.status;
    return status === 404;
  }
}
