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

describe("the shop's KDS delete slips", () => {
  it("saves the switch without dropping the other venue settings", async () => {
    const current = {
      spaEnabled: true,
      spaMenuOrdering: false,
      ktvEnabled: true,
      ktvMenuOrdering: true,
      paymentTiming: "PAY_AT_END",
      roomCardOnly: true,
      maxPromotionsPerItem: 1,
      maxPromotionsPerBill: 5,
      currency: "MMK",
      trackStock: false,
      kdsDeleteSlips: true,
      defaultTaxRateIds: ["tax-1"],
      serviceChargeBps: 500,
      serviceChargeOnBar: true,
      serviceChargeOnSpa: true,
      serviceChargeOnKtv: true,
    };
    const put = vi.fn().mockResolvedValue({
      data: { ...current, kdsDeleteSlips: false },
    });
    const repository = new ApiVenueSettingRepository({
      get: vi.fn().mockResolvedValue({ data: current }),
      put,
    } as unknown as HttpClient);

    const updated = await repository.updateKdsDeleteSlips(false);

    expect(updated.kdsDeleteSlips).toBe(false);
    expect(put).toHaveBeenCalledWith(
      "/api/v1/venue-settings",
      expect.objectContaining({
        kdsDeleteSlips: false,
        spaMenuOrdering: false,
        trackStock: false,
        defaultTaxRateIds: ["tax-1"],
        serviceChargeBps: 500,
      })
    );
  });
});
