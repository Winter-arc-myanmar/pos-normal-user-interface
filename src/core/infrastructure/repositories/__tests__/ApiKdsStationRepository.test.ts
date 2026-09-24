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
          printerId: "printer-1",
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
      printerId: "printer-1",
      routingRules: { categoryIds: ["drink", "alcohol"] },
    });
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/kds/stations", {
      tenantId: "tenant-1",
      locationId: "location-1",
      name: "Bar",
      displayColor: "#2563eb",
      printerId: "printer-1",
      routingRules: { categoryIds: ["drink", "alcohol"] },
    });
    expect(created.routingRules.categoryIds).toEqual(["drink", "alcohol"]);
  });
});
