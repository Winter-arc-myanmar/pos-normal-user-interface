import {
  CreateRefundDTO,
  RefundListQueryDTO,
  RefundListResponseDTO,
} from "../dtos/RefundDTO";
import { SalesRefund } from "../../domain/entities/SalesRefund";
import { IRefundRepository } from "../../domain/repositories/IRefundRepository";
import { IRefundService } from "../../domain/services/IRefundService";

const quantityText = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Returned quantity must be greater than zero");
  }
  return parsed.toFixed(4);
};

export class RefundService implements IRefundService {
  constructor(private refundRepository: IRefundRepository) {}

  async createRefund(payload: CreateRefundDTO): Promise<SalesRefund> {
    if (!payload.tenantId?.trim()) throw new Error("Tenant is required");
    if (!payload.salesOrderId?.trim()) throw new Error("Sales order is required");
    if (!payload.reason?.trim()) throw new Error("Reason is required");
    if (!payload.refundMethod?.trim()) throw new Error("Refund method is required");
    if (!payload.posSessionId?.trim()) throw new Error("POS session is required");
    if (!payload.items?.length) throw new Error("Select at least one item to return");

    return this.refundRepository.createRefund({
      tenantId: payload.tenantId.trim(),
      salesOrderId: payload.salesOrderId.trim(),
      reason: payload.reason.trim(),
      refundMethod: payload.refundMethod.trim(),
      posSessionId: payload.posSessionId.trim(),
      items: payload.items.map((item) => ({
        salesOrderLineId: item.salesOrderLineId,
        returnedQuantity: quantityText(item.returnedQuantity),
      })),
    });
  }

  async getRefundById(id: string): Promise<SalesRefund> {
    if (!id?.trim()) throw new Error("Refund id is required");
    return this.refundRepository.getRefundById(id);
  }

  async listRefundsForOrder(
    salesOrderId: string,
    params?: RefundListQueryDTO
  ): Promise<RefundListResponseDTO> {
    if (!salesOrderId?.trim()) throw new Error("Sales order is required");
    return this.refundRepository.listRefundsForOrder(salesOrderId, params);
  }
}
