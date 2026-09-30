import { SalesRefund } from "../../domain/entities/SalesRefund";

export interface CreateRefundItemDTO {
  salesOrderLineId: string;
  returnedQuantity: string;
}

export interface CreateRefundDTO {
  salesOrderId: string;
  reason: string;
  refundMethod: string;
  posSessionId: string;
  items: CreateRefundItemDTO[];
  tenantId: string;
}

export interface RefundListQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface RefundListResponseDTO {
  refunds: SalesRefund[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
