import {
  CategoryFilterDTO,
  CategoryListDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from "../dtos/CategoryDTO";
import { Category } from "../../domain/entities/Category";
import { ICategoryRepository } from "../../domain/repositories/ICategoryRepository";
import { ICategoryService } from "../../domain/services/ICategoryService";

export class CategoryService implements ICategoryService {
  constructor(private readonly repository: ICategoryRepository) {}

  list(params?: CategoryFilterDTO): Promise<CategoryListDTO> {
    return this.repository.list(params);
  }

  tree(): Promise<Category[]> {
    return this.repository.tree();
  }

  getById(id: string): Promise<Category> {
    if (!id?.trim()) throw new Error("Category ID is required");
    return this.repository.getById(id);
  }

  create(payload: CreateCategoryDTO): Promise<Category> {
    if (!payload.tenantId?.trim()) throw new Error("Tenant ID is required");
    if (!payload.name?.trim()) throw new Error("Category name is required");
    if (payload.sortOrder !== undefined && payload.sortOrder < 0) {
      throw new Error("Sort order cannot be negative");
    }
    return this.repository.create(payload);
  }

  update(id: string, payload: UpdateCategoryDTO): Promise<Category> {
    if (!id?.trim()) throw new Error("Category ID is required");
    if (payload.name !== undefined && !payload.name.trim()) {
      throw new Error("Category name is required");
    }
    if (payload.sortOrder !== undefined && payload.sortOrder < 0) {
      throw new Error("Sort order cannot be negative");
    }
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<Category> {
    if (!id?.trim()) throw new Error("Category ID is required");
    return this.repository.delete(id);
  }
}
