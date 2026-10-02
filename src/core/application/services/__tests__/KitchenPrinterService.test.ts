import { describe, expect, it, vi } from "vitest";
import { IKitchenPrinterRepository } from "../../../domain/repositories/IKitchenPrinterRepository";
import { KitchenPrinter } from "../../../domain/entities/KitchenPrinter";
import { KitchenPrinterService } from "../KitchenPrinterService";

describe("KitchenPrinterService", () => {
  it("requires a sector and omits empty ipAddress for USB printers", async () => {
    const create = vi.fn().mockResolvedValue(
      new KitchenPrinter({
        id: "printer-1",
        name: "USB Counter",
        sectors: ["CHECKOUT"],
        port: 9100,
        isActive: true,
      })
    );
    const service = new KitchenPrinterService({
      create,
    } as unknown as IKitchenPrinterRepository);

    expect(() =>
      service.create({
        tenantId: "tenant-1",
        locationId: "location-1",
        name: "USB Counter",
        port: 9100,
        sectors: [],
        isActive: true,
      })
    ).toThrow("At least one printer sector is required");

    await service.create({
      tenantId: "tenant-1",
      locationId: "location-1",
      name: "USB Counter",
      ipAddress: "  ",
      port: 9100,
      sectors: ["CHECKOUT", "CHECKOUT"],
      isActive: true,
    });

    expect(create).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      locationId: "location-1",
      name: "USB Counter",
      port: 9100,
      sectors: ["CHECKOUT"],
      isActive: true,
    });
  });
});
