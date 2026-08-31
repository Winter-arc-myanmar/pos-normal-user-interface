import { ICustomerRepository } from "../../domain/repositories/ICustomerRepository";
import { Customer, CustomerInteraction } from "../../domain/entities/Customer";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import {
  CreateCustomerDTO,
  CreateCustomerInteractionDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
  CustomerInteractionFilterDTO,
  CustomerInteractionListResponseDTO,
  UpdateCustomerDTO,
  UpdateCustomerInteractionDTO,
} from "../../application/dtos/CustomerDTO";

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

const asList = <T>(response: unknown): T[] => {
  const value = unwrap(response as never);
  if (Array.isArray(value)) return value as T[];
  const container = asRecord(value);
  if (!container) return [];
  if (Array.isArray(container.data)) return container.data as T[];
  if (Array.isArray(container.items)) return container.items as T[];
  if (Array.isArray(container.customers)) return container.customers as T[];
  if (Array.isArray(container.interactions)) {
    return container.interactions as T[];
  }
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

const toCustomer = (item: Record<string, unknown>): Customer =>
  new Customer({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    accountType: String(item.accountType || "RETAIL"),
    name: String(item.name || ""),
    phone: String(item.phone || ""),
    email: String(item.email || ""),
    hasCreditAccount: Boolean(item.hasCreditAccount),
    maxCreditLimit: String(item.maxCreditLimit ?? "0.0000"),
    currentCreditBalance: String(item.currentCreditBalance ?? "0.0000"),
    paymentTermsDays: Number(item.paymentTermsDays || 0),
    loyaltyTier: String(item.loyaltyTier || "BRONZE"),
    lifetimePointsEarned: Number(item.lifetimePointsEarned || 0),
    createdAt: String(item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
  });

const toInteraction = (item: Record<string, unknown>): CustomerInteraction =>
  new CustomerInteraction({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    customerId: String(item.customerId || ""),
    agentId: item.agentId ? String(item.agentId) : undefined,
    interactionChannel: String(item.interactionChannel || ""),
    interactionType: String(item.interactionType || ""),
    summary: String(item.summary || ""),
    detailedNotes: item.detailedNotes ? String(item.detailedNotes) : undefined,
    externalReferenceId: item.externalReferenceId
      ? String(item.externalReferenceId)
      : undefined,
    interactionDate: String(item.interactionDate || item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
  });

const toCustomerList = (
  response: unknown,
  fallbackLimit: number
): CustomerDomainListResponseDTO => {
  const items = asList<Record<string, unknown>>(response).map(toCustomer);
  const meta = toMeta(response, fallbackLimit, items.length);
  return {
    customers: items,
    total: meta.total,
    page: meta.page,
    limit: meta.limit,
    totalPages: meta.totalPages,
    hasNextPage: meta.page < meta.totalPages,
    hasPrevPage: meta.page > 1,
  };
};

const toInteractionList = (
  response: unknown,
  fallbackLimit: number
): CustomerInteractionListResponseDTO => {
  const items = asList<Record<string, unknown>>(response).map(toInteraction);
  const meta = toMeta(response, fallbackLimit, items.length);
  return {
    interactions: items,
    total: meta.total,
    page: meta.page,
    limit: meta.limit,
    totalPages: meta.totalPages,
  };
};

export class ApiCustomerRepository implements ICustomerRepository {
  constructor(private httpClient: HttpClient) {}

  async createCustomer(customerData: CreateCustomerDTO): Promise<Customer> {
    const response = await this.httpClient.post<
      ApiEnvelope<Record<string, unknown>>
    >(API_ENDPOINTS.CUSTOMERS.CREATE, customerData);
    return toCustomer(unwrap(response));
  }

  async getCustomers(
    params?: CustomerFilterDTO
  ): Promise<CustomerDomainListResponseDTO> {
    const response = await this.httpClient.get<
      ApiEnvelope<Record<string, unknown>[]>
    >(API_ENDPOINTS.CUSTOMERS.LIST, { params });
    return toCustomerList(response, params?.limit || 6);
  }

  async getCustomerById(id: string): Promise<Customer> {
    const response = await this.httpClient.get<
      ApiEnvelope<Record<string, unknown>>
    >(API_ENDPOINTS.CUSTOMERS.BY_ID(id));
    return toCustomer(unwrap(response));
  }

  async updateCustomer(
    id: string,
    customerData: UpdateCustomerDTO
  ): Promise<Customer> {
    const response = await this.httpClient.patch<
      ApiEnvelope<Record<string, unknown>>
    >(API_ENDPOINTS.CUSTOMERS.UPDATE(id), customerData);
    return toCustomer(unwrap(response));
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await this.httpClient.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id));
    return true;
  }

  async getCustomerInteractions(
    params?: CustomerInteractionFilterDTO
  ): Promise<CustomerInteractionListResponseDTO> {
    const response = await this.httpClient.get<
      ApiEnvelope<Record<string, unknown>[]>
    >(API_ENDPOINTS.CUSTOMER_INTERACTIONS.LIST, { params });
    return toInteractionList(response, params?.limit || 10);
  }

  async getCustomerInteractionById(id: string): Promise<CustomerInteraction> {
    const response = await this.httpClient.get<
      ApiEnvelope<Record<string, unknown>>
    >(API_ENDPOINTS.CUSTOMER_INTERACTIONS.BY_ID(id));
    return toInteraction(unwrap(response));
  }

  async getInteractionsForCustomer(
    customerId: string,
    params?: CustomerInteractionFilterDTO
  ): Promise<CustomerInteractionListResponseDTO> {
    const response = await this.httpClient.get<
      ApiEnvelope<Record<string, unknown>[]>
    >(API_ENDPOINTS.CUSTOMERS.INTERACTIONS(customerId).LIST, { params });
    return toInteractionList(response, params?.limit || 10);
  }

  async getInteractionForCustomer(
    customerId: string,
    id: string
  ): Promise<CustomerInteraction> {
    const response = await this.httpClient.get<
      ApiEnvelope<Record<string, unknown>>
    >(API_ENDPOINTS.CUSTOMERS.INTERACTIONS(customerId).BY_ID(id));
    return toInteraction(unwrap(response));
  }

  async createCustomerInteraction(
    customerId: string,
    payload: CreateCustomerInteractionDTO
  ): Promise<CustomerInteraction> {
    const response = await this.httpClient.post<
      ApiEnvelope<Record<string, unknown>>
    >(API_ENDPOINTS.CUSTOMERS.INTERACTIONS(customerId).CREATE, payload);
    return toInteraction(unwrap(response));
  }

  async updateCustomerInteraction(
    customerId: string,
    id: string,
    payload: UpdateCustomerInteractionDTO
  ): Promise<CustomerInteraction> {
    const response = await this.httpClient.patch<
      ApiEnvelope<Record<string, unknown>>
    >(API_ENDPOINTS.CUSTOMERS.INTERACTIONS(customerId).UPDATE(id), payload);
    return toInteraction(unwrap(response));
  }

  async deleteCustomerInteraction(
    customerId: string,
    id: string
  ): Promise<boolean> {
    await this.httpClient.delete(
      API_ENDPOINTS.CUSTOMERS.INTERACTIONS(customerId).DELETE(id)
    );
    return true;
  }
}
