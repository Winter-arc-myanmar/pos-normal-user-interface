export interface KdsRoutingRules {
  categoryIds: string[];
}

export class KdsStation {
  id!: string;
  tenantId!: string;
  locationId!: string;
  name!: string;
  displayColor?: string;
  printerIds!: string[];
  routingRules!: KdsRoutingRules;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;

  constructor(data: Partial<KdsStation>) {
    Object.assign(this, { printerIds: [], ...data });
  }
}
