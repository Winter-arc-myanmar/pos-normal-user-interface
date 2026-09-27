import {
  CategoryFilterDTO,
  CategoryListDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from "../../application/dtos/CategoryDTO";
import { Category } from "../entities/Category";

export interface ICategoryRepository {
  list(params?: CategoryFilterDTO): Promise<CategoryListDTO>;
  tree(): Promise<Category[]>;
  getById(id: string): Promise<Category>;
  create(payload: CreateCategoryDTO): Promise<Category>;
  update(id: string, payload: UpdateCategoryDTO): Promise<Category>;
  delete(id: string): Promise<Category>;
}
