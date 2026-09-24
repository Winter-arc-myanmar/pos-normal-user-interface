import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../api/HttpClient";
import { ApiPrintTemplateRepository } from "../ApiPrintTemplateRepository";

describe("ApiPrintTemplateRepository", () => {
  it("lists, creates, and resolves print templates", async () => {
    const template = {
      id: "template-1",
      tenantId: "tenant-1",
      type: "RECEIPT",
      name: "Default receipt",
      paperWidth: "MM80",
      isDefault: true,
      settings: { language: "FOLLOW_POS", copies: ["CUSTOMER"] },
    };
    const httpClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
          data: [template],
        })
        .mockResolvedValueOnce({
          data: { ...template, source: "LOCATION" },
        }),
      post: vi.fn().mockResolvedValue({ data: template }),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    const repository = new ApiPrintTemplateRepository(
      httpClient as unknown as HttpClient
    );

    const listed = await repository.list({ page: 1, limit: 10, type: "RECEIPT" });
    expect(listed.templates[0]).toMatchObject({
      id: "template-1",
      name: "Default receipt",
      paperWidth: "MM80",
      settings: { language: "FOLLOW_POS", copies: ["CUSTOMER"] },
    });

    await repository.create({ type: "RECEIPT", name: "Default receipt" });
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/print-templates", {
      type: "RECEIPT",
      name: "Default receipt",
    });

    const resolved = await repository.resolve({
      type: "RECEIPT",
      locationId: "location-1",
    });
    expect(httpClient.get).toHaveBeenLastCalledWith("/api/v1/print-templates/resolve", {
      params: { type: "RECEIPT", locationId: "location-1" },
    });
    expect(resolved.source).toBe("LOCATION");
  });
});
