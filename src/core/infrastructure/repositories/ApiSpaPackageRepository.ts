import type { SpaPackage } from "../../domain/entities/Spa";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

export class ApiSpaPackageRepository {
  constructor(private readonly httpClient: HttpClient) {}

  /** The packages on sale now, for the start and extend pickers. */
  async onSale(): Promise<SpaPackage[]> {
    const response = await this.httpClient.get<unknown>(API_ENDPOINTS.SPA_PACKAGES.LIST, {
      params: { activeOnly: true, page: 1, limit: 100 },
    });
    const body = asRecord(response);
    const rows = Array.isArray(body.data) ? body.data : Array.isArray(response) ? response : [];
    return rows.map((row) => {
      const item = asRecord(row);
      const included = Array.isArray(item.items) ? item.items : [];
      return {
        id: String(item.id || ""),
        name: String(item.name || ""),
        durationMinutes: Number(item.durationMinutes || 0),
        price: Number(item.price || 0),
        variantId: String(item.variantId || ""),
        items: included.map((entry) => {
          const included = asRecord(entry);
          return { name: String(included.name || ""), quantity: Number(included.quantity || 1) };
        }),
      };
    });
  }
}
