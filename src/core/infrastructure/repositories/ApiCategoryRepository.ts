import {
  CategoryFilterDTO,
  CategoryListDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
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

const toCategory = (item: RecordValue): Category => {
  const rawChildren = item.children ?? item.childCategories;
  const children = Array.isArray(rawChildren)
    ? rawChildren
        .filter((child) => child && typeof child === "object")
        .map((child) => toCategory(child as RecordValue))
    : undefined;
  return new Category({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    parentId: item.parentId ? String(item.parentId) : undefined,
    name: String(item.name || ""),
    description: item.description ? String(item.description) : undefined,
    sortOrder: Number(item.sortOrder || 0),
    deletedAt: item.deletedAt ? String(item.deletedAt) : null,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
    children,
  });
};

const asCategoryList = (value: unknown): RecordValue[] => {
  if (Array.isArray(value)) return value as RecordValue[];
  if (!value || typeof value !== "object") return [];
  const record = value as RecordValue;
  if (record.id) return [record];
  for (const key of ["items", "categories", "children", "results"]) {
    if (Array.isArray(record[key])) return record[key] as RecordValue[];
  }
  return [];
};

const toPayload = (
  payload: CreateCategoryDTO | UpdateCategoryDTO,
  withTenant: boolean
) => {
  const body: RecordValue = {};
  if (withTenant && "tenantId" in payload && payload.tenantId?.trim()) {
    body.tenantId = payload.tenantId.trim();
  }
  if (payload.name !== undefined && payload.name.trim()) body.name = payload.name.trim();
  if (payload.description !== undefined) {
    const description = payload.description?.trim() || "";
    if (description || !withTenant) body.description = description || null;
  }
  if (payload.sortOrder !== undefined) body.sortOrder = payload.sortOrder;
  if (payload.parentId !== undefined) {
    if (payload.parentId) body.parentId = payload.parentId;
    else if (!withTenant) body.parentId = null;
  }
  return body;
};

export class ApiCategoryRepository implements ICategoryRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async list(params?: CategoryFilterDTO): Promise<CategoryListDTO> {
    const response = await this.httpClient.get<ApiEnvelope<RecordValue[]>>(
      API_ENDPOINTS.CATEGORIES.LIST,
      { params }
    );
    const value = unwrap(response);
    const categories = asCategoryList(value).map(toCategory);
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

  async tree(): Promise<Category[]> {
    const response = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.CATEGORIES.TREE
    );
    return asCategoryList(unwrap(response)).map(toCategory);
  }

  async getById(id: string): Promise<Category> {
    const response = await this.httpClient.get<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.CATEGORIES.BY_ID(id)
    );
    return toCategory(unwrap(response));
  }

  async create(payload: CreateCategoryDTO): Promise<Category> {
    const response = await this.httpClient.post<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.CATEGORIES.CREATE,
      toPayload(payload, true)
    );
    return toCategory(unwrap(response));
  }

  async update(id: string, payload: UpdateCategoryDTO): Promise<Category> {
    const response = await this.httpClient.patch<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.CATEGORIES.UPDATE(id),
      toPayload(payload, false)
    );
    return toCategory(unwrap(response));
  }

  async delete(id: string): Promise<Category> {
    const response = await this.httpClient.delete<ApiEnvelope<RecordValue>>(
      API_ENDPOINTS.CATEGORIES.DELETE(id)
    );
    return toCategory(unwrap(response));
  }
}
