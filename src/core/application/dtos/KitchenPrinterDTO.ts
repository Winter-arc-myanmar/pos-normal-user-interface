import { KitchenPrinter } from "../../domain/entities/KitchenPrinter";

export interface CreateKitchenPrinterDTO {
  tenantId: string;
  locationId: string;
  name: string;
  ipAddress: string;
  port: number;
  isActive: boolean;
}

export interface UpdateKitchenPrinterDTO {
  locationId?: string;
  name?: string;
  ipAddress?: string;
  port?: number;
  isActive?: boolean;
}

export interface KitchenPrinterFilterDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface KitchenPrinterListDTO {
  printers: KitchenPrinter[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
