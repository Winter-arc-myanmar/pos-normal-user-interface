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
  /**
   * The signed-in user's tenant, used to guard the form. The refund endpoint
   * takes the tenant from the auth token, so it is never sent in the body.
   */
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
