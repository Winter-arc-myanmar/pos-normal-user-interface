import { OrderStatus, ServiceType } from "../../application/dtos/CashierDTO";

export class InventoryLocation {
  id!: string;
  tenantId!: string;
  name!: string;
  type!: string;
  parentLocationId?: string | null;

  constructor(data: Partial<InventoryLocation>) {
    Object.assign(this, data);
  }
}

export class Product {
  id!: string;
  tenantId!: string;
  categoryId?: string;
  name!: string;
  basePrice!: string;
  baseSku?: string;
  imageUrl?: string;
  totalOnHand?: string;

  constructor(data: Partial<Product>) {
    Object.assign(this, data);
  }
}

export class ProductVariant {
  id!: string;
  productId!: string;
  variantSku?: string;
  barcode?: string;
  priceModifier?: string;
  imageUrl?: string;
  matrixOptions?: Record<string, unknown>;

  constructor(data: Partial<ProductVariant>) {
    Object.assign(this, data);
  }
}

export class SalesOrder {
  id!: string;
  tenantId!: string;
  locationId!: string;
  customerId?: string;
  orderNumber!: string;
  salesChannel!: string;
  serviceType!: ServiceType;
  status!: OrderStatus;
  grandTotal!: string;
  subtotal!: string;
  totalTax!: string;
  totalDiscount!: string;
  createdAt!: string;
  updatedAt!: string;

  constructor(data: Partial<SalesOrder>) {
    Object.assign(this, data);
  }
}

export class SalesOrderLine {
  id!: string;
  salesOrderId!: string;
  variantId!: string;
  quantity!: string;
  unitPrice!: string;
  lineDiscount?: string;
  taxAmount?: string;
  status?: string;
  seatNumber?: number;
  createdAt?: string;

  constructor(data: Partial<SalesOrderLine>) {
    Object.assign(this, data);
  }
}

export class OrderPayment {
  id!: string;
  salesOrderId!: string;
  paymentMethodId!: string;
  amount!: string;
  tipAmount?: string;
  transactionReference?: string;
  paymentDate?: string;

  constructor(data: Partial<OrderPayment>) {
    Object.assign(this, data);
  }
}

export class PaymentMethod {
  id!: string;
  tenantId!: string;
  name!: string;

  constructor(data: Partial<PaymentMethod>) {
    Object.assign(this, data);
  }
}

export class DiningZone {
  id!: string;
  tenantId!: string;
  name!: string;
  sortOrder!: number;
  layoutSvg?: string;

  constructor(data: Partial<DiningZone>) {
    Object.assign(this, data);
  }
}

export class DiningTable {
  id!: string;
  tenantId!: string;
  zoneId!: string;
  tableNumber!: string;
  maxSeats!: number;
  posX?: string;
  posY?: string;
  shape?: string;
  status!: "AVAILABLE" | "OCCUPIED" | "DIRTY" | "RESERVED";

  constructor(data: Partial<DiningTable>) {
    Object.assign(this, data);
  }
}

export class TableSession {
  id!: string;
  tenantId!: string;
  tableId!: string;
  waiterId?: string;
  guestCount!: number;
  openedAt!: string;
  closedAt?: string | null;
  salesOrderId!: string;
  sessionState!: "SEATED" | "ORDERING" | "SERVED" | "PAYMENT_PENDING" | "CLOSED";
  posRegisterId?: string;
  openedByPosSessionId?: string;

  constructor(data: Partial<TableSession>) {
    Object.assign(this, data);
  }
}

export class AdjustmentReason {
  id!: string;
  tenantId!: string;
  code!: string;
  name!: string;
  description?: string;
  isActive!: boolean;
  requiresManagerOverride!: boolean;

  constructor(data: Partial<AdjustmentReason>) {
    Object.assign(this, data);
  }
}

export class WaitlistEntry {
  id!: string;
  tenantId!: string;
  locationId!: string;
  customerId?: string;
  guestName!: string;
  guestPhone!: string;
  partySize!: number;
  joinedAt!: string;
  estimatedWaitMins?: number;
  preferredZoneId?: string;
  assignedTableId?: string;
  tableSessionId?: string;
  notifiedAt?: string | null;
  seatedAt?: string | null;
  canceledAt?: string | null;
  notes?: string | null;
  status!: "WAITING" | "NOTIFIED" | "SEATED" | "CANCELED" | "NO_SHOW";

  constructor(data: Partial<WaitlistEntry>) {
    Object.assign(this, data);
  }
}

export class TipPool {
  id!: string;
  tenantId!: string;
  locationId!: string;
  name!: string;
  periodStart!: string;
  periodEnd!: string;
  distributionMethod!: string;
  totalTips!: string;
  totalServiceCharge!: string;
  includeServiceCharge!: boolean;
  serviceChargeShareBps!: number;
  totalDistributable!: string;
  status!: "OPEN" | "SETTLED";
  settledAt?: string | null;
  settledBy?: string | null;
  notes?: string | null;

  constructor(data: Partial<TipPool>) {
    Object.assign(this, data);
  }
}

export class TipPoolAllocation {
  id!: string;
  poolId!: string;
  userId!: string;
  role!: string;
  hoursWorked!: string;
  weight!: string;
  amount!: string;
  notes?: string | null;

  constructor(data: Partial<TipPoolAllocation>) {
    Object.assign(this, data);
  }
}
