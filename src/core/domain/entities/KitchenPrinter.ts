export class KitchenPrinter {
  id!: string;
  tenantId!: string;
  locationId!: string;
  name!: string;
  ipAddress!: string;
  port!: number;
  isActive!: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;

  constructor(data: Partial<KitchenPrinter>) {
    Object.assign(this, data);
  }
}
