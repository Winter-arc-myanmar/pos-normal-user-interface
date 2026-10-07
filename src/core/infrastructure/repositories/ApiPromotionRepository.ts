import type {
  PosType,
  PromotionDiscount,
  RunningPromotion,
} from "../../domain/entities/Promotion";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

const unwrap = (response: unknown): unknown => {
  const record = asRecord(response);
  return "data" in record ? unwrap(record.data) : response;
};

export class ApiPromotionRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async running(posType: PosType, locationId?: string): Promise<RunningPromotion[]> {
    const response = await this.httpClient.get<unknown>(API_ENDPOINTS.PROMOTIONS.RUNNING, {
      params: { posType, ...(locationId ? { locationId } : {}) },
    });
    const rows = unwrap(response);
    return (Array.isArray(rows) ? rows : []).map((row) => {
      const item = asRecord(row);
      return {
        id: String(item.id || ""),
        name: String(item.name || ""),
        discountType:
          item.discountType === "AMOUNT_OFF" || item.discountType === "FREE_TIME"
            ? item.discountType
            : "PERCENT_OFF",
        discountValue: Number(item.discountValue || 0),
        buyUnits: item.buyUnits == null ? null : Number(item.buyUnits),
        freeUnits: item.freeUnits == null ? null : Number(item.freeUnits),
        appliesTo:
          item.appliesTo === "CATEGORIES" || item.appliesTo === "ITEMS"
            ? item.appliesTo
            : "ALL_ITEMS",
        productGroups: Array.isArray(item.productGroups)
          ? (item.productGroups.map(String) as RunningPromotion["productGroups"])
          : [],
        variantIds: Array.isArray(item.variantIds) ? item.variantIds.map(String) : [],
        priorityLevel: Number(item.priorityLevel || 0),
      };
    });
  }

  /** What promotions take off each item, keyed by variant. */
  async preview(
    posType: PosType,
    locationId: string | undefined,
    items: { variantId: string; quantity: number; unitPrice?: number }[],
    salesOrderId?: string
  ): Promise<Record<string, PromotionDiscount>> {
    const response = await this.httpClient.post<unknown>(API_ENDPOINTS.PROMOTIONS.PREVIEW, {
      posType,
      ...(locationId ? { locationId } : {}),
      ...(salesOrderId ? { salesOrderId } : {}),
      items,
    });
    const lines = asRecord(unwrap(response)).lines;
    const byVariant: Record<string, PromotionDiscount> = {};
    for (const line of Array.isArray(lines) ? lines : []) {
      const item = asRecord(line);
      const promotions = Array.isArray(item.promotions) ? item.promotions : [];
      byVariant[String(item.variantId || "")] = {
        discount: Number(item.discount || 0),
        names: promotions.map((p) => String(asRecord(p).name || "")).filter(Boolean),
      };
    }
    return byVariant;
  }
}
