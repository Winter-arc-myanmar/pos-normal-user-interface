import { SalesRefund } from "../entities/SalesRefund";
import {
  CreateRefundDTO,
  RefundListQueryDTO,
  RefundListResponseDTO,
} from "../../application/dtos/RefundDTO";

export interface IRefundService {
  /** A manager's approval token rides along; see ApiShiftRepository.approve. */
  createRefund(payload: CreateRefundDTO, approverToken?: string): Promise<SalesRefund>;
  getRefundById(id: string): Promise<SalesRefund>;
  listRefundsForOrder(
    salesOrderId: string,
    params?: RefundListQueryDTO
  ): Promise<RefundListResponseDTO>;
}
