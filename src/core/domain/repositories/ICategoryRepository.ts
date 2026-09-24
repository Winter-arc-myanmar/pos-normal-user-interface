import {
  CategoryFilterDTO,
  CategoryListDTO,
} from "../../application/dtos/CategoryDTO";

export interface ICategoryRepository {
  list(params?: CategoryFilterDTO): Promise<CategoryListDTO>;
}
