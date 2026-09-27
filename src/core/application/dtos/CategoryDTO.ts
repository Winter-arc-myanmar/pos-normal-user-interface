import { Category } from "../../domain/entities/Category";

export interface CategoryFilterDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CategoryListDTO {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCategoryDTO {
  name: string;
  tenantId: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryDTO {
  name?: string;
  parentId?: string | null;
  description?: string | null;
  sortOrder?: number;
}
