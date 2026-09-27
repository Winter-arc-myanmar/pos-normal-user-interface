import { useCallback, useState } from "react";
import {
  CategoryFilterDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from "../../application/dtos/CategoryDTO";
import { Category } from "../../domain/entities/Category";
import { ICategoryService } from "../../domain/services/ICategoryService";
import container from "../../infrastructure/di/container";

export function useCategoryManagement() {
  const service = container.resolve<ICategoryService>("categoryService");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tree, setTree] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Category request failed");
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listCategories = useCallback(
    (params?: CategoryFilterDTO) =>
      run(async () => {
        const result = await service.list(params);
        setCategories(result.categories);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotal(result.total);
        return result;
      }),
    [run, service]
  );

  const listTree = useCallback(
    () =>
      run(async () => {
        const result = await service.tree();
        setTree(result);
        return result;
      }),
    [run, service]
  );

  const createCategory = useCallback(
    (payload: CreateCategoryDTO) =>
      run(async () => {
        const created = await service.create(payload);
        setCategories((current) => [created, ...current]);
        setTotal((current) => current + 1);
        return created;
      }),
    [run, service]
  );

  const updateCategory = useCallback(
    (id: string, payload: UpdateCategoryDTO) =>
      run(async () => {
        const updated = await service.update(id, payload);
        setCategories((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
        return updated;
      }),
    [run, service]
  );

  const deleteCategory = useCallback(
    (id: string) =>
      run(async () => {
        const removed = await service.delete(id);
        setCategories((current) => current.filter((item) => item.id !== id));
        setTotal((current) => Math.max(0, current - 1));
        return removed;
      }),
    [run, service]
  );

  return {
    categories,
    tree,
    page,
    totalPages,
    total,
    isLoading,
    error,
    listCategories,
    listTree,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
