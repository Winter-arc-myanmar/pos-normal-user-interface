import { describe, expect, it } from "vitest";
import { menuProductFilter } from "../menuProducts";

describe("menuProductFilter", () => {
  it("asks for the branch's own items, in a stable order", () => {
    expect(menuProductFilter("loc-1")).toEqual({
      page: 1,
      limit: 100,
      inStockOnly: true,
      sortBy: "name",
      sortOrder: "asc",
      locationId: "loc-1",
    });
  });

  it("waits for the branch instead of fetching a menu it would replace", () => {
    expect(menuProductFilter("")).toBeNull();
  });
});
