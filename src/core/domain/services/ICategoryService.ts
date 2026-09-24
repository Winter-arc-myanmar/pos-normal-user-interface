import {
  CategoryFilterDTO,
  CategoryListDTO,
} from "../../application/dtos/CategoryDTO";

export interface ICategoryService {
  list(params?: CategoryFilterDTO): Promise<CategoryListDTO>;
}
