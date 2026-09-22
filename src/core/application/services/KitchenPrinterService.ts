import {
  CreateKitchenPrinterDTO,
  KitchenPrinterFilterDTO,
  KitchenPrinterListDTO,
  UpdateKitchenPrinterDTO,
} from "../dtos/KitchenPrinterDTO";
import { KitchenPrinter } from "../../domain/entities/KitchenPrinter";
import { IKitchenPrinterRepository } from "../../domain/repositories/IKitchenPrinterRepository";
import { IKitchenPrinterService } from "../../domain/services/IKitchenPrinterService";

export class KitchenPrinterService implements IKitchenPrinterService {
  constructor(private repository: IKitchenPrinterRepository) {}

  list(params?: KitchenPrinterFilterDTO): Promise<KitchenPrinterListDTO> {
    return this.repository.list(params);
  }

  getById(id: string): Promise<KitchenPrinter> {
    if (!id.trim()) throw new Error("Printer ID is required");
    return this.repository.getById(id);
  }

  create(payload: CreateKitchenPrinterDTO): Promise<KitchenPrinter> {
    if (!payload.tenantId.trim() || !payload.locationId.trim()) {
      throw new Error("Tenant and location are required");
    }
    if (!payload.name.trim() || !payload.ipAddress.trim()) {
      throw new Error("Printer name and IP address are required");
    }
    if (!Number.isInteger(payload.port) || payload.port < 1 || payload.port > 65535) {
      throw new Error("Printer port must be between 1 and 65535");
    }
    return this.repository.create(payload);
  }

  update(id: string, payload: UpdateKitchenPrinterDTO): Promise<KitchenPrinter> {
    if (!id.trim()) throw new Error("Printer ID is required");
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<KitchenPrinter> {
    if (!id.trim()) throw new Error("Printer ID is required");
    return this.repository.delete(id);
  }

  attachCategory(id: string, categoryId: string): Promise<void> {
    if (!id.trim() || !categoryId.trim()) {
      throw new Error("Printer and category IDs are required");
    }
    return this.repository.attachCategory(id, categoryId);
  }

  detachCategory(id: string, categoryId: string): Promise<void> {
    if (!id.trim() || !categoryId.trim()) {
      throw new Error("Printer and category IDs are required");
    }
    return this.repository.detachCategory(id, categoryId);
  }
}
