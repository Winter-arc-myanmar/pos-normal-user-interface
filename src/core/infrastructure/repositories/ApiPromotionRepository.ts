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
        discountType: item.discountType === "AMOUNT_OFF" ? "AMOUNT_OFF" : "PERCENT_OFF",
        discountValue: Number(item.discountValue || 0),
      };
    });
  }

  /** What promotions take off each item, keyed by variant. */
  async preview(
    posType: PosType,
    locationId: string | undefined,
    items: { variantId: string; quantity: number }[]
  ): Promise<Record<string, PromotionDiscount>> {
    const response = await this.httpClient.post<unknown>(API_ENDPOINTS.PROMOTIONS.PREVIEW, {
      posType,
      ...(locationId ? { locationId } : {}),
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
