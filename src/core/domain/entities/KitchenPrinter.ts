export type PrinterSector = "KDS" | "CHECKOUT" | "FINANCE";

export const PRINTER_SECTORS: PrinterSector[] = ["CHECKOUT", "FINANCE", "KDS"];

export interface PrinterCategoryRoute {
  printerId: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
}

export class KitchenPrinter {
  id!: string;
  tenantId!: string;
  locationId!: string;
  name!: string;
  ipAddress?: string;
  port!: number;
  sectors!: PrinterSector[];
  isActive!: boolean;
  categories!: PrinterCategoryRoute[];
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;

  constructor(data: Partial<KitchenPrinter>) {
    Object.assign(this, { sectors: [], categories: [], ...data });
  }
}
