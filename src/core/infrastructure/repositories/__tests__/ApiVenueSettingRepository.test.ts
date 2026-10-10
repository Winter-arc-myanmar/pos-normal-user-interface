import { describe, expect, it, vi } from "vitest";
import type { HttpClient } from "../../api/HttpClient";
import { ApiVenueSettingRepository } from "../ApiVenueSettingRepository";

const repositoryReturning = (data: unknown) =>
  new ApiVenueSettingRepository({ get: vi.fn().mockResolvedValue(data) } as unknown as HttpClient);

describe("the shop's default tax rate", () => {
  it("reads the rate as a fraction the till can price with", async () => {
    const setting = await repositoryReturning({
      defaultTaxRate: { id: "tax-1", name: "CT", ratePercentage: "0.0500", isPriceInclusive: false },
    }).get();
    expect(setting.defaultTaxRate).toEqual({ id: "tax-1", rate: 0.05, isPriceInclusive: false });
  });

  it("is none when the shop has not chosen one", async () => {
    expect((await repositoryReturning({ defaultTaxRate: null }).get()).defaultTaxRate).toBeNull();
  });
});
