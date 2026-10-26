import { describe, expect, it, vi } from "vitest";
import type { ProductFilterDTO } from "@/core/application/dtos/CashierDTO";
import type { ICashierRepository } from "@/core/domain/repositories/ICashierRepository";
import type { Product } from "@/core/domain/entities/Cashier";
import { CashierService } from "../CashierService";

const product = (id: string) => ({ id, name: id }) as unknown as Product;

const pagedRepository = (pages: Product[][]) => {
  const listProducts = vi.fn(async (params?: ProductFilterDTO) => {
    const page = params?.page ?? 1;
    return {
      products: pages[page - 1] ?? [],
      total: pages.flat().length,
      page,
      limit: params?.limit ?? 100,
      totalPages: pages.length,
    };
  });
  return {
    listProducts,
    service: new CashierService({ listProducts } as unknown as ICashierRepository),
  };
};

describe("CashierService.getProducts", () => {
  it("loads every page so the menu is not cut off at the first 100", async () => {
    const { listProducts, service } = pagedRepository([
      [product("a"), product("b")],
      [product("c"), product("d")],
      [product("e")],
    ]);

    const products = await service.getProducts({ page: 1, limit: 2, locationId: "l1" });

    expect(products.map((item) => item.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(listProducts).toHaveBeenCalledTimes(3);
    expect(listProducts).toHaveBeenLastCalledWith({ page: 3, limit: 2, locationId: "l1" });
  });

  it("asks once when everything fits on one page", async () => {
    const { listProducts, service } = pagedRepository([[product("a")]]);

    await service.getProducts({ page: 1, limit: 100 });

    expect(listProducts).toHaveBeenCalledTimes(1);
  });
});
