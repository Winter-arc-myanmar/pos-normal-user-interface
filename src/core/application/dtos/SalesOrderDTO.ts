import type { OrderStatus } from "./CashierDTO";
import type {
  CreateSalesOrderDTO,
  SalesOrderFilterDTO,
  UpdateSalesOrderLineDTO,
  UpsertSalesOrderLineDTO,
} from "./CashierDTO";
import { SalesOrder, SalesOrderLine } from "../../domain/entities/Cashier";

export type {
  CreateSalesOrderDTO,
  SalesOrderFilterDTO,
  UpdateSalesOrderLineDTO,
  UpsertSalesOrderLineDTO,
};

export interface SalesOrderListResponseDTO {
  orders: SalesOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SalesOrderLineListResponseDTO {
  lines: SalesOrderLine[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateSalesOrderDTO {
  tenantId?: string;
  customerId?: string;
  locationId?: string;
  orderNumber?: string;
  salesChannel?: string;
  idempotencyKey?: string;
  subtotal?: string;
  totalDiscount?: string;
  totalTax?: string;
  grandTotal?: string;
  status?: OrderStatus;
}

export interface SettlePaymentDTO {
  paymentMethodId: string;
  amount?: string;
  guestCardId?: string;
  tipAmount?: string;
  transactionReference?: string;
}

export interface SettleSalesOrderDTO {
  payments: SettlePaymentDTO[];
  customerId?: string;
  posSessionId?: string;
  tipAmount?: string;
  serviceCharge?: string;
  /** Omitted charge flags default to true on the backend. */
  includeTax?: boolean;
  includeServiceCharge?: boolean;
  totalDiscount?: string;
  discountReasonId?: string;
  idempotencyKey?: string;
}

export interface EditOrderLineDTO {
  /** A line already on the order; left out for a new line. */
  id?: string;
  variantId?: string;
  quantity: string;
  unitPrice: string;
  lineDiscount?: string;
  hostessId?: string | null;
}

/** The order as it should be after the edit; a line left out is taken off. */
export interface EditSalesOrderPreviewDTO {
  lines: EditOrderLineDTO[];
  billDiscount?: string;
  discountReasonId?: string;
  includeTax?: boolean;
  includeServiceCharge?: boolean;
  customerId?: string | null;
  paymentMethods?: { paymentId: string; paymentMethodId: string }[];
  posSessionId?: string;
}

export interface EditSalesOrderDTO extends EditSalesOrderPreviewDTO {
  reason: string;
  /** How the difference is taken or given back when the total changes. */
  settlement?: {
    paymentMethodId: string;
    guestCardId?: string;
    transactionReference?: string;
  };
}

export interface EditSalesOrderPreviewResultDTO {
  previousTotal: string;
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  serviceCharge: string;
  tipAmount: string;
  newTotal: string;
  /** To take when positive, to give back when negative. */
  difference: string;
}

export interface EditSalesOrderResultDTO {
  editId: string;
  orderId: string;
  orderNumber: string;
  previousTotal: string;
  newTotal: string;
  difference: string;
}

export interface SalesOrderEditDTO {
  id: string;
  reason: string;
  editedByName: string;
  approvedByName: string;
  previousTotal: string;
  newTotal: string;
  createdAt: string;
}

export interface SalesOrderBillQueryDTO {
  /** Nonnegative decimal string for the order discount. */
  discount?: string;
  /** Omitted charge flags default to true on the backend. */
  includeTax?: boolean;
  includeServiceCharge?: boolean;
}

/** Authoritative preview totals, normalized to decimal strings by the repository. */
export interface SalesOrderBillDTO {
  orderId: string;
  /** Gross prices before discount; tax-free net prices when includeTax is false. */
  subtotal: string;
  totalDiscount: string;
  addedTax: string;
  /** All tax, including inclusive line tax and service-charge tax. */
  totalTax: string;
  serviceCharge: string;
  serviceChargeTax: string;
  grandTotal: string;
}

export interface SettleSalesOrderResultDTO {
  orderId: string;
  orderNumber: string;
  grandTotal: string;
  totalPaid: string;
  change: string;
  status: string;
}

export interface VoidSalesOrderLineDTO {
  voidReasonId: string;
  notes?: string;
}

export interface CompSalesOrderLineDTO {
  compReasonId: string;
  notes?: string;
}
