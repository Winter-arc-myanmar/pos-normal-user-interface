import { describe, expect, it } from "vitest";
import { Product } from "@/core/domain/entities/Cashier";
import { categoryByProductName } from "../menuCategoryLookup";

const product = (name: string, categoryId?: string) =>
  new Product({ id: name, name, categoryId });

describe("categoryByProductName", () => {
  it("maps a product name to the category it is sold under", () => {
    const lookup = categoryByProductName([
      product("Chinese fried noodle", "cat-chinese"),
      product("Tiger Beer", "cat-beer"),
    ]);

    expect(lookup.get("chinese fried noodle")).toBe("cat-chinese");
    expect(lookup.get("tiger beer")).toBe("cat-beer");
  });

  it("ignores a name sold under two categories, so nothing prints at the wrong station", () => {
    const lookup = categoryByProductName([
      product("Rice", "cat-food"),
      product("Rice", "cat-bar"),
      product("Beer", "cat-beer"),
    ]);

    expect(lookup.has("rice")).toBe(false);
    expect(lookup.get("beer")).toBe("cat-beer");
  });

  it("ignores a product with no category and a nameless row", () => {
    const lookup = categoryByProductName([
      product("Mystery", undefined),
      product("", "cat-food"),
    ]);

    expect(lookup.size).toBe(0);
  });
});
