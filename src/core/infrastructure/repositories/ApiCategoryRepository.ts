import {
  CategoryFilterDTO,
  CategoryListDTO,
} from "../../application/dtos/CategoryDTO";
import { Category } from "../../domain/entities/Category";
import { ICategoryRepository } from "../../domain/repositories/ICategoryRepository";
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

const toCategory = (item: RecordValue) =>
  new Category({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    parentId: item.parentId ? String(item.parentId) : undefined,
    name: String(item.name || ""),
    description: item.description ? String(item.description) : undefined,
    sortOrder: Number(item.sortOrder || 0),
    deletedAt: item.deletedAt ? String(item.deletedAt) : null,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
  });

export class ApiCategoryRepository implements ICategoryRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async list(params?: CategoryFilterDTO): Promise<CategoryListDTO> {
    const response = await this.httpClient.get<ApiEnvelope<RecordValue[]>>(
      API_ENDPOINTS.CATEGORIES.LIST,
      { params }
    );
    const value = unwrap(response);
    const categories = (Array.isArray(value) ? value : []).map(toCategory);
    const meta =
      response && typeof response === "object" && "meta" in response
        ? response.meta || {}
        : {};
    const limit = Number(meta.limit || params?.limit || 10);
    const total = Number(meta.total ?? categories.length);
    return {
      categories,
      total,
      page: Number(meta.page || params?.page || 1),
      limit,
      totalPages: Number(
        meta.totalPages || Math.max(1, Math.ceil(total / Math.max(limit, 1)))
      ),
    };
  }
}
