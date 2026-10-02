import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../api/HttpClient";
import { ApiCategoryRepository } from "../ApiCategoryRepository";
import { ApiKdsStationRepository } from "../ApiKdsStationRepository";

describe("category and KDS station repositories", () => {
  it("lists categories and creates a station with those category ids", async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValueOnce({
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
        data: [
          { id: "drink", tenantId: "tenant-1", name: "Drink", sortOrder: 1 },
          { id: "alcohol", tenantId: "tenant-1", name: "Alcohol", sortOrder: 2 },
        ],
      }),
      post: vi.fn().mockResolvedValue({
        data: {
          id: "station-1",
          tenantId: "tenant-1",
          locationId: "location-1",
          name: "Bar",
          displayColor: "#2563eb",
          printerIds: ["printer-1", "printer-2"],
          routingRules: { categoryIds: ["drink", "alcohol"] },
        },
      }),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    const categories = new ApiCategoryRepository(httpClient as unknown as HttpClient);
    const stations = new ApiKdsStationRepository(httpClient as unknown as HttpClient);

    const listed = await categories.list({ page: 1, limit: 10 });
    expect(listed.categories.map((category) => category.name)).toEqual([
      "Drink",
      "Alcohol",
    ]);

    const created = await stations.create({
      tenantId: "tenant-1",
      locationId: "location-1",
      name: "Bar",
      displayColor: "#2563eb",
      printerIds: ["printer-1", "printer-2"],
      routingRules: { categoryIds: ["drink", "alcohol"] },
    });
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/kds/stations", {
      tenantId: "tenant-1",
      locationId: "location-1",
      name: "Bar",
      displayColor: "#2563eb",
      printerIds: ["printer-1", "printer-2"],
      routingRules: { categoryIds: ["drink", "alcohol"] },
    });
    expect(created.printerIds).toEqual(["printer-1", "printer-2"]);
    expect(created.routingRules.categoryIds).toEqual(["drink", "alcohol"]);
  });

  it("creates a category and reads nested tree children", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "phones",
        tenantId: "tenant-1",
        parentId: "electronics",
        name: "Phones",
        description: "Mobile phones",
        sortOrder: 1,
      },
    });
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "electronics",
        tenantId: "tenant-1",
        name: "Electronics",
        sortOrder: 0,
        children: [
          {
            id: "phones",
            tenantId: "tenant-1",
            parentId: "electronics",
            name: "Phones",
            sortOrder: 1,
          },
        ],
      },
    });
    const repository = new ApiCategoryRepository({
      get,
      post,
    } as unknown as HttpClient);

    const created = await repository.create({
      name: "Phones",
      tenantId: "tenant-1",
      parentId: "electronics",
      description: "Mobile phones",
      sortOrder: 1,
    });
    const tree = await repository.tree();

    expect(post).toHaveBeenCalledWith("/api/v1/categories", {
      name: "Phones",
      tenantId: "tenant-1",
      parentId: "electronics",
      description: "Mobile phones",
      sortOrder: 1,
    });
    expect(created.parentId).toBe("electronics");
    expect(get).toHaveBeenCalledWith("/api/v1/categories/tree");
    expect(tree[0].name).toBe("Electronics");
    expect(tree[0].children?.[0].name).toBe("Phones");
  });
});
