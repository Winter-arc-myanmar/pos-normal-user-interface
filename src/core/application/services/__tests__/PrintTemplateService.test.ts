import { describe, expect, it, vi } from "vitest";
import { IPrintTemplateRepository } from "../../../domain/repositories/IPrintTemplateRepository";
import { PrintTemplate } from "../../../domain/entities/PrintTemplate";
import { PrintTemplateService } from "../PrintTemplateService";

describe("PrintTemplateService", () => {
  it("accepts RECEIPT, KITCHEN, and FINANCE and allows create with only type and name", async () => {
    const create = vi.fn().mockResolvedValue(
      new PrintTemplate({ id: "template-1", type: "FINANCE", name: "Default finance" })
    );
    const resolve = vi.fn().mockResolvedValue(
      new PrintTemplate({
        id: "template-1",
        type: "FINANCE",
        name: "Default finance",
        source: "LOCATION",
      })
    );
    const service = new PrintTemplateService({
      create,
      resolve,
    } as unknown as IPrintTemplateRepository);

    expect(() =>
      service.create({ type: "RECEIPT", name: "  " })
    ).toThrow("Print template name is required");

    await service.create({ type: "FINANCE", name: "Default finance" });
    expect(create).toHaveBeenCalledWith({
      type: "FINANCE",
      name: "Default finance",
    });

    await service.resolve({ type: "KITCHEN", locationId: "location-1" });
    expect(resolve).toHaveBeenCalledWith({
      type: "KITCHEN",
      locationId: "location-1",
    });
  });
});
