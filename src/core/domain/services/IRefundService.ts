import { SalesRefund } from "../entities/SalesRefund";
import {
  CreateRefundDTO,
  RefundListQueryDTO,
  RefundListResponseDTO,
} from "../../application/dtos/RefundDTO";

export interface IRefundService {
  createRefund(payload: CreateRefundDTO): Promise<SalesRefund>;
  getRefundById(id: string): Promise<SalesRefund>;
  listRefundsForOrder(
    salesOrderId: string,
    params?: RefundListQueryDTO
  ): Promise<RefundListResponseDTO>;
}
