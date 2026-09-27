import { useCallback, useState } from "react";
import {
  CreateProductDTO,
  CreateProductVariantDTO,
  PaginatedQueryDTO,
  ProductFilterDTO,
  UpdateProductDTO,
  UpdateProductVariantDTO,
} from "../../application/dtos/CashierDTO";
import { CategoryFilterDTO } from "../../application/dtos/CategoryDTO";
import { Category } from "../../domain/entities/Category";
import {
  InventoryLocation,
  Product,
  ProductVariant,
  TaxRate,
  Uom,
} from "../../domain/entities/Cashier";
import { ICashierService } from "../../domain/services/ICashierService";
import { ICategoryService } from "../../domain/services/ICategoryService";
import container from "../../infrastructure/di/container";

export function useProductManagement() {
  const service = container.resolve<ICashierService>("cashierService");
  const categoryService = container.resolve<ICategoryService>("categoryService");
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uoms, setUoms] = useState<Uom[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [variantPage, setVariantPage] = useState(1);
  const [variantTotalPages, setVariantTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Product request failed");
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listLookups = useCallback(async (params?: CategoryFilterDTO) => {
    const [categoryResult, uomResult, taxResult, locationResult] = await Promise.allSettled([
      categoryService.list({ page: 1, limit: 100, sortBy: "name", sortOrder: "asc", ...params }),
      service.listUoms({ page: 1, limit: 100, sortBy: "name", sortOrder: "asc" }),
      service.listTaxRates({ page: 1, limit: 100, sortBy: "name", sortOrder: "asc" }),
      service.getInventoryLocations(),
    ]);
    if (categoryResult.status === "fulfilled") setCategories(categoryResult.value.categories);
    if (uomResult.status === "fulfilled") setUoms(uomResult.value);
    if (taxResult.status === "fulfilled") setTaxRates(taxResult.value);
    if (locationResult.status === "fulfilled") setLocations(locationResult.value);
  }, [categoryService, service]);

  const listProducts = useCallback(
    (params?: ProductFilterDTO) =>
      run(async () => {
        const result = await service.listProducts(params);
        setProducts(result.products);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotal(result.total);
        return result;
      }),
    [run, service]
  );

  const createProduct = useCallback(
    (payload: CreateProductDTO) =>
      run(async () => {
        const created = await service.createProduct(payload);
        setProducts((current) => [created, ...current]);
        setTotal((current) => current + 1);
        return created;
      }),
    [run, service]
  );

  const updateProduct = useCallback(
    (id: string, payload: UpdateProductDTO) =>
      run(async () => {
        const updated = await service.updateProduct(id, payload);
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
        return updated;
      }),
    [run, service]
  );

  const deleteProduct = useCallback(
    (id: string) =>
      run(async () => {
        const removed = await service.deleteProduct(id);
        setProducts((current) => current.filter((item) => item.id !== id));
        setTotal((current) => Math.max(0, current - 1));
        setVariants([]);
        return removed;
      }),
    [run, service]
  );

  const listVariants = useCallback(
    (productId: string, params?: PaginatedQueryDTO) =>
      run(async () => {
        const result = await service.listVariants(productId, params);
        setVariants(result.variants);
        setVariantPage(result.page);
        setVariantTotalPages(result.totalPages);
        return result;
      }),
    [run, service]
  );

  const createVariant = useCallback(
    (productId: string, payload: CreateProductVariantDTO) =>
      run(async () => {
        const created = await service.createVariant(productId, payload);
        setVariants((current) => [created, ...current]);
        return created;
      }),
    [run, service]
  );

  const updateVariant = useCallback(
    (productId: string, id: string, payload: UpdateProductVariantDTO) =>
      run(async () => {
        const updated = await service.updateVariant(productId, id, payload);
        setVariants((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
        return updated;
      }),
    [run, service]
  );

  const deleteVariant = useCallback(
    (productId: string, id: string) =>
      run(async () => {
        const removed = await service.deleteVariant(productId, id);
        setVariants((current) => current.filter((item) => item.id !== id));
        return removed;
      }),
    [run, service]
  );

  return {
    products,
    variants,
    categories,
    uoms,
    taxRates,
    locations,
    page,
    totalPages,
    total,
    variantPage,
    variantTotalPages,
    isLoading,
    error,
    listLookups,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listVariants,
    createVariant,
    updateVariant,
    deleteVariant,
  };
}
