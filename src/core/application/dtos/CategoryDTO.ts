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
