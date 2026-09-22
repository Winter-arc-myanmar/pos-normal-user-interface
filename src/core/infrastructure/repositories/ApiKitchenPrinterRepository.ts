import {
  CreateKitchenPrinterDTO,
  KitchenPrinterFilterDTO,
  KitchenPrinterListDTO,
  UpdateKitchenPrinterDTO,
} from "../../application/dtos/KitchenPrinterDTO";
import { KitchenPrinter } from "../../domain/entities/KitchenPrinter";
import { IKitchenPrinterRepository } from "../../domain/repositories/IKitchenPrinterRepository";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

type RecordValue = Record<string, unknown>;

interface ApiEnvelope<T> {
  data?: T;
  meta?: RecordValue;
}

const unwrap = <T>(response: ApiEnvelope<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return unwrap((response as ApiEnvelope<T>).data as T);
  }
  return response as T;
};

const toPrinter = (item: RecordValue) =>
  new KitchenPrinter({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    locationId: String(item.locationId || ""),
    name: String(item.name || ""),
    ipAddress: String(item.ipAddress || ""),
    port: Number(item.port || 9100),
    isActive: item.isActive !== false,
    deletedAt: item.deletedAt ? String(item.deletedAt) : null,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
  });

export class ApiKitchenPrinterRepository implements IKitchenPrinterRepository {
  constructor(private httpClient: HttpClient) {}

  async list(params?: KitchenPrinterFilterDTO): Promise<KitchenPrinterListDTO> {
    const response = await this.httpClient.get<ApiEnvelope<RecordValue[]>>(
      API_ENDPOINTS.KITCHEN_PRINTERS.LIST,
      { params }
    );
    const value = unwrap(response);
    const rows = Array.isArray(value) ? value : [];
    const printers = rows.map(toPrinter);
    const meta =
      response && typeof response === "object" && "meta" in response
        ? (response.meta || {})
        : {};
    const limit = Number(meta.limit || params?.limit || 10);
    const total = Number(meta.total ?? printers.length);
    return {
      printers,
      total,
      page: Number(meta.page || params?.page || 1),
      limit,
      totalPages: Number(
        meta.totalPages || Math.max(1, Math.ceil(total / Math.max(limit, 1)))
      ),
    };
  }

  async getById(id: string): Promise<KitchenPrinter> {
    const response = await this.httpClient.get<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.KITCHEN_PRINTERS.BY_ID(id)
    );
    return toPrinter(unwrap(response));
  }

  async create(payload: CreateKitchenPrinterDTO): Promise<KitchenPrinter> {
    const response = await this.httpClient.post<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.KITCHEN_PRINTERS.CREATE,
      payload
    );
    return toPrinter(unwrap(response));
  }

  async update(
    id: string,
    payload: UpdateKitchenPrinterDTO
  ): Promise<KitchenPrinter> {
    const response = await this.httpClient.patch<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.KITCHEN_PRINTERS.UPDATE(id),
      payload
    );
    return toPrinter(unwrap(response));
  }

  async delete(id: string): Promise<KitchenPrinter> {
    const response = await this.httpClient.delete<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.KITCHEN_PRINTERS.DELETE(id)
    );
    return toPrinter(unwrap(response));
  }

  async attachCategory(id: string, categoryId: string): Promise<void> {
    await this.httpClient.post(
      API_ENDPOINTS.KITCHEN_PRINTERS.ATTACH_CATEGORY(id),
      { categoryId }
    );
  }

  async detachCategory(id: string, categoryId: string): Promise<void> {
    await this.httpClient.delete(
      API_ENDPOINTS.KITCHEN_PRINTERS.DETACH_CATEGORY(id, categoryId)
    );
  }
}
