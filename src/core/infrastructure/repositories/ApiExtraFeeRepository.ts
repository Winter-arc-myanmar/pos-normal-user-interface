import type { ExtraFee } from "../../domain/entities/ExtraFee";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

const unwrap = (response: unknown): unknown => {
  const record = asRecord(response);
  return "data" in record ? unwrap(record.data) : response;
};

export class ApiExtraFeeRepository {
  constructor(private readonly httpClient: HttpClient) {}

  /** Every fee, turned off ones too: a bill may still carry one. */
  async list(): Promise<ExtraFee[]> {
    const rows = unwrap(await this.httpClient.get<unknown>(API_ENDPOINTS.EXTRA_FEES.LIST));
    return (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const item = asRecord(row);
        return {
          id: String(item.id || ""),
          name: String(item.name || ""),
          amount: Number(item.amount || 0),
          variantId: String(item.variantId || ""),
          isActive: item.isActive !== false,
          isOther: item.isOther === true,
        };
      })
      .filter((fee) => fee.variantId);
  }
}
