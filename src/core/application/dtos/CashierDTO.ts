export type ServiceType = "TABLE" | "DINE_IN" | "TAKE_AWAY" | "DELIVERY" | "PICK_UP";
export type ApiServiceType = "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "COUNTER";

export function toApiServiceType(
  serviceType: ServiceType | ApiServiceType
): ApiServiceType {
  switch (serviceType) {
    case "TABLE":
      return "DINE_IN";
    case "TAKE_AWAY":
      return "TAKEAWAY";
    case "PICK_UP":
      return "COUNTER";
    case "TAKEAWAY":
      return "TAKEAWAY";
    case "COUNTER":
      return "COUNTER";
    default:
      return serviceType;
  }
}

export function fromApiServiceType(serviceType?: string): ServiceType {
  switch (String(serviceType || "").toUpperCase()) {
    case "TAKEAWAY":
      return "TAKE_AWAY";
    case "COUNTER":
      return "PICK_UP";
    case "DELIVERY":
      return "DELIVERY";
    case "DINE_IN":
      return "DINE_IN";
    default:
      return "DINE_IN";
  }
}
export type OrderStatus = "DRAFT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type DiningTableStatus = "AVAILABLE" | "OCCUPIED" | "DIRTY" | "RESERVED";
export type TableSessionState =
  | "SEATED"
  | "ORDERING"
  | "SERVED"
  | "PAYMENT_PENDING"
  | "CLOSED";
export type WaitlistStatus =
  | "WAITING"
  | "NOTIFIED"
  | "SEATED"
  | "CANCELED"
  | "NO_SHOW";
export type TipPoolStatus = "OPEN" | "SETTLED";

export interface PaginatedQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ProductFilterDTO extends PaginatedQueryDTO {
  categoryId?: string;
  trackingType?: string;
  inStockOnly?: boolean;
  locationId?: string;
}

export interface SalesOrderFilterDTO extends PaginatedQueryDTO {
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DiningTableFilterDTO extends PaginatedQueryDTO {
  zoneId?: string;
  status?: DiningTableStatus;
}

export interface TableSessionFilterDTO extends PaginatedQueryDTO {
  tableId?: string;
  waiterId?: string;
  sessionState?: TableSessionState;
  openOnly?: boolean;
}

export interface PosRegisterFilterDTO extends PaginatedQueryDTO {}

export interface PosSessionFilterDTO extends PaginatedQueryDTO {
  registerId?: string;
  cashierId?: string;
  status?: "OPEN" | "CLOSED";
}

export interface CreateSalesOrderDTO {
  tenantId: string;
  locationId: string;
  customerId?: string;
  orderNumber?: string;
  salesChannel?: string;
  idempotencyKey?: string;
  subtotal?: string;
  totalDiscount?: string;
  totalTax?: string;
  grandTotal?: string;
  status?: OrderStatus;
}

export interface UpsertSalesOrderLineDTO {
  variantId: string;
  quantity: string;
  unitPrice: string;
  lineDiscount?: string;
  taxRateId?: string;
  taxAmount?: string;
  appliedPromotionId?: string;
  courseType?: string;
  selectedModifiers?: Array<{
    modifierId: string;
    name: string;
    priceDelta: string;
  }>;
  seatNumber?: number;
}

export type UpdateSalesOrderLineDTO = Partial<UpsertSalesOrderLineDTO>;

export interface CreateOrderPaymentDTO {
  tenantId: string;
  paymentMethodId: string;
  posSessionId?: string;
  amount: string;
  tipAmount?: string;
  transactionReference?: string;
}

export interface CreatePosRegisterDTO {
  tenantId: string;
  locationId: string;
  code: string;
  name: string;
  macAddress: string;
}

export interface CreatePosSessionDTO {
  tenantId: string;
  registerId: string;
  cashierId: string;
  openingCashFloat: string;
  expectedClosingCash?: string;
  status: "OPEN" | "CLOSED";
}

export interface CheckoutRequestDTO {
  locationId: string;
  salesChannel: string;
  customerId?: string;
  posSessionId?: string;
  serviceType: ServiceType | ApiServiceType;
  lineStatus?: string;
  tipAmount?: string;
  serviceCharge?: string;
  discountReasonId?: string;
  idempotencyKey?: string;
  tenantId: string;
  items: Array<{
    variantId: string;
    quantity: string;
    lineDiscount?: string;
  }>;
  payments: Array<{
    paymentMethodId: string;
    amount: string;
    tipAmount?: string;
    transactionReference?: string;
  }>;
}

export interface OpenTableSessionDTO {
  tenantId: string;
  tableId: string;
  locationId: string;
  guestCount: number;
  waiterId?: string;
  posRegisterId?: string;
  openedByPosSessionId?: string;
  salesChannel: "POS";
}

export interface UpdateTableSessionStateDTO {
  sessionState: TableSessionState;
}

export interface TableSessionCheckoutDTO {
  payments: Array<{
    paymentMethodId: string;
    amount: string;
    tipAmount?: string;
    transactionReference?: string;
  }>;
  tipAmount?: number;
  serviceCharge?: number;
  discountReasonId?: string;
  totalDiscount?: number;
}

export interface FireKdsDTO {
  sessionId?: string;
  salesOrderId?: string;
}

export interface WaitlistFilterDTO extends PaginatedQueryDTO {
  locationId?: string;
  status?: WaitlistStatus;
  activeOnly?: boolean;
}

export interface CreateWaitlistEntryDTO {
  tenantId: string;
  locationId: string;
  customerId?: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  estimatedWaitMins?: number;
  preferredZoneId?: string;
  notes?: string;
}

export interface UpdateWaitlistEntryDTO {
  locationId?: string;
  customerId?: string;
  guestName?: string;
  guestPhone?: string;
  partySize?: number;
  estimatedWaitMins?: number;
  preferredZoneId?: string;
  notes?: string;
}

export interface SeatWaitlistEntryDTO {
  tableId: string;
  waiterId?: string;
  guestCount: number;
  posRegisterId?: string;
  openedByPosSessionId?: string;
}

export interface TipPoolFilterDTO {
  page?: number;
  limit?: number;
  locationId?: string;
  status?: TipPoolStatus;
  fromDate?: string;
  toDate?: string;
}

export interface CreateTipPoolDTO {
  tenantId: string;
  locationId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  distributionMethod: string;
  includeServiceCharge?: boolean;
  serviceChargeShareBps?: number;
  notes?: string;
}

export interface UpdateTipPoolDTO {
  name?: string;
  periodStart?: string;
  periodEnd?: string;
  distributionMethod?: string;
  includeServiceCharge?: boolean;
  serviceChargeShareBps?: number;
  notes?: string;
}

export interface TipPoolAllocationDTO {
  userId: string;
  role: string;
  hoursWorked?: number;
  weight?: number;
  amount?: number;
  notes?: string | null;
}
