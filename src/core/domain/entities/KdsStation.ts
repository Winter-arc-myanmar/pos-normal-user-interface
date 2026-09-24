export interface KdsRoutingRules {
  categoryIds: string[];
}

export class KdsStation {
  id!: string;
  tenantId!: string;
  locationId!: string;
  name!: string;
  displayColor?: string;
  printerId?: string;
  routingRules!: KdsRoutingRules;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;

  constructor(data: Partial<KdsStation>) {
    Object.assign(this, data);
  }
}
