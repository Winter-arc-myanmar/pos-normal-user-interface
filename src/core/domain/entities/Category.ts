export class Category {
  id!: string;
  tenantId!: string;
  parentId?: string;
  name!: string;
  description?: string;
  sortOrder!: number;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;

  constructor(data: Partial<Category>) {
    Object.assign(this, data);
  }
}
