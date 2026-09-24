import {
  CreateKdsStationDTO,
  KdsStationFilterDTO,
  KdsStationListDTO,
  UpdateKdsStationDTO,
} from "../../application/dtos/KdsStationDTO";
import { KdsStation } from "../../domain/entities/KdsStation";
import { IKdsStationRepository } from "../../domain/repositories/IKdsStationRepository";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

type RecordValue = Record<string, unknown>;

interface ApiEnvelope<T> {
  data?: T;
  meta?: RecordValue;
}

const unwrap = <T>(response: ApiEnvelope<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiEnvelope<T>).data as T;
  }
  return response as T;
};

const toStation = (item: RecordValue) => {
  const rules =
    item.routingRules && typeof item.routingRules === "object"
      ? (item.routingRules as RecordValue)
      : {};
  const categoryIds = Array.isArray(rules.categoryIds)
    ? rules.categoryIds.map((id) => String(id))
    : [];
  return new KdsStation({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    locationId: String(item.locationId || ""),
    name: String(item.name || ""),
    displayColor: item.displayColor ? String(item.displayColor) : undefined,
    printerId: item.printerId ? String(item.printerId) : undefined,
    routingRules: { categoryIds },
    deletedAt: item.deletedAt ? String(item.deletedAt) : null,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
  });
};

const toList = (
  response: ApiEnvelope<RecordValue[]>,
  params: { page?: number; limit?: number } | undefined,
  rows: KdsStation[]
): KdsStationListDTO => {
  const meta = response.meta || {};
  const limit = Number(meta.limit || params?.limit || 10);
  const total = Number(meta.total ?? rows.length);
  return {
    stations: rows,
    total,
    page: Number(meta.page || params?.page || 1),
    limit,
    totalPages: Number(
      meta.totalPages || Math.max(1, Math.ceil(total / Math.max(limit, 1)))
    ),
  };
};

export class ApiKdsStationRepository implements IKdsStationRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async list(params?: KdsStationFilterDTO): Promise<KdsStationListDTO> {
    const response = await this.httpClient.get<ApiEnvelope<RecordValue[]>>(
      API_ENDPOINTS.KDS.STATIONS,
      { params }
    );
    const value = unwrap(response);
    return toList(
      response,
      params,
      (Array.isArray(value) ? value : []).map(toStation)
    );
  }

  async getById(id: string): Promise<KdsStation> {
    const response = await this.httpClient.get<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.KDS.STATION(id)
    );
    return toStation(unwrap(response));
  }

  async create(payload: CreateKdsStationDTO): Promise<KdsStation> {
    const response = await this.httpClient.post<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.KDS.STATIONS,
      payload
    );
    return toStation(unwrap(response));
  }

  async update(id: string, payload: UpdateKdsStationDTO): Promise<KdsStation> {
    const response = await this.httpClient.patch<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.KDS.STATION(id),
      payload
    );
    return toStation(unwrap(response));
  }

  async delete(id: string): Promise<KdsStation> {
    const response = await this.httpClient.delete<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.KDS.STATION(id)
    );
    return toStation(unwrap(response));
  }
}
