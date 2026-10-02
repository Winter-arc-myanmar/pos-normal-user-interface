import {
  CreateRefundDTO,
  RefundListQueryDTO,
  RefundListResponseDTO,
} from "../../application/dtos/RefundDTO";
import { SalesRefund, SalesRefundLine } from "../../domain/entities/SalesRefund";
import { IRefundRepository } from "../../domain/repositories/IRefundRepository";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  data?: T;
}

const unwrap = <T>(response: ApiEnvelope<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiEnvelope<T>).data as T;
  }
  return response as T;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asList = (response: unknown): Record<string, unknown>[] => {
  const value = unwrap(response as ApiEnvelope<unknown>);
  if (Array.isArray(value)) return value.filter(asRecord) as Record<string, unknown>[];
  return [];
};

const toMeta = (response: unknown, fallbackLimit: number, count: number) => {
  const meta = asRecord(asRecord(response)?.meta);
  const page = Number(meta?.page || 1);
  const limit = Number(meta?.limit || fallbackLimit);
  const total = Number(meta?.total ?? count);
  const totalPages = Number(
    meta?.totalPages || Math.max(1, Math.ceil((total || 1) / (limit || 1)))
  );
  return { page, limit, total, totalPages };
};

const toLine = (item: Record<string, unknown>): SalesRefundLine =>
  new SalesRefundLine({
    id: String(item.id || ""),
    salesOrderLineId: String(item.salesOrderLineId || ""),
    variantId: item.variantId ? String(item.variantId) : undefined,
    returnedQuantity: String(item.returnedQuantity ?? "0.0000"),
    unitPrice: String(item.unitPrice ?? "0.0000"),
    lineDiscount: String(item.lineDiscount ?? "0.0000"),
    taxAmount: String(item.taxAmount ?? "0.0000"),
    lineRefund: String(item.lineRefund ?? "0.0000"),
  });

const toRefund = (item: Record<string, unknown>): SalesRefund =>
  new SalesRefund({
    returnId: String(item.returnId || item.id || ""),
    returnNumber: String(item.returnNumber || ""),
    salesOrderId: String(item.salesOrderId || ""),
    reason: String(item.reason || ""),
    refundMethod: String(item.refundMethod || ""),
    subtotalRefund: String(item.subtotalRefund ?? "0.0000"),
    taxRefund: String(item.taxRefund ?? "0.0000"),
    totalRefund: String(item.totalRefund ?? "0.0000"),
    orderStatus: item.orderStatus ? String(item.orderStatus) : undefined,
    lines: Array.isArray(item.lines)
      ? item.lines.filter(asRecord).map((line) => toLine(line as Record<string, unknown>))
      : [],
    createdAt: String(item.createdAt || ""),
  });

export class ApiRefundRepository implements IRefundRepository {
  constructor(private httpClient: HttpClient) {}

  async createRefund(payload: CreateRefundDTO): Promise<SalesRefund> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.REFUNDS.CREATE,
      {
        salesOrderId: payload.salesOrderId,
        reason: payload.reason,
        refundMethod: payload.refundMethod,
        posSessionId: payload.posSessionId,
        items: payload.items.map((item) => ({
          salesOrderLineId: item.salesOrderLineId,
          returnedQuantity: item.returnedQuantity,
        })),
        tenantId: payload.tenantId,
      }
    );
    return toRefund(asRecord(unwrap(response)) || {});
  }

  async getRefundById(id: string): Promise<SalesRefund> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.REFUNDS.BY_ID(id)
    );
    return toRefund(asRecord(unwrap(response)) || {});
  }

  async listRefundsForOrder(
    salesOrderId: string,
    params?: RefundListQueryDTO
  ): Promise<RefundListResponseDTO> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.REFUNDS.BY_ORDER(salesOrderId),
      { params }
    );
    const refunds = asList(response).map(toRefund);
    const meta = toMeta(response, params?.limit || 10, refunds.length);
    return { refunds, ...meta };
  }
}
