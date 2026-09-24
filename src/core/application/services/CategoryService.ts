import {
  CategoryFilterDTO,
  CategoryListDTO,
} from "../dtos/CategoryDTO";
import { ICategoryRepository } from "../../domain/repositories/ICategoryRepository";
import { ICategoryService } from "../../domain/services/ICategoryService";

export class CategoryService implements ICategoryService {
  constructor(private readonly repository: ICategoryRepository) {}

  list(params?: CategoryFilterDTO): Promise<CategoryListDTO> {
    return this.repository.list(params);
  }
}
