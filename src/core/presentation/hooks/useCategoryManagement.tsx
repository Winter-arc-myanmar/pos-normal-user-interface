import { useCallback, useState } from "react";
import { CategoryFilterDTO } from "../../application/dtos/CategoryDTO";
import { Category } from "../../domain/entities/Category";
import { ICategoryService } from "../../domain/services/ICategoryService";
import container from "../../infrastructure/di/container";

export function useCategoryManagement() {
  const service = container.resolve<ICategoryService>("categoryService");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listCategories = useCallback(
    async (params?: CategoryFilterDTO) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await service.list(params);
        setCategories(result.categories);
        return result;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load categories");
        throw caught;
      } finally {
        setIsLoading(false);
      }
    },
    [service]
  );

  return { categories, isLoading, error, listCategories };
}
