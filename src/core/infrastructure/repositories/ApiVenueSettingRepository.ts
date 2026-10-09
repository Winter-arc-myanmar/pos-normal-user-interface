import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import type { PriceCurrency } from "../../domain/entities/PrintTemplate";

export interface VenueSetting {
  paymentTiming: "PAY_WHEN_ORDERING" | "PAY_AT_END";
  /** Guests may order food and drinks during a SPA treatment. */
  spaMenuOrdering: boolean;
  /** Guests may order food and drinks in a KTV room. */
  ktvMenuOrdering: boolean;
  /** The money customers pay in. */
  currency: PriceCurrency;
}

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

export class ApiVenueSettingRepository {
  constructor(private readonly httpClient: HttpClient) {}

  /** How this business takes payment for SPA and KTV rooms, from Venue setup. */
  async get(): Promise<VenueSetting> {
    const response = asRecord(await this.httpClient.get<unknown>(API_ENDPOINTS.VENUE_SETTINGS.GET));
    const data = asRecord("data" in response ? response.data : response);
    return {
      paymentTiming: data.paymentTiming === "PAY_AT_END" ? "PAY_AT_END" : "PAY_WHEN_ORDERING",
      spaMenuOrdering: data.spaMenuOrdering !== false,
      ktvMenuOrdering: data.ktvMenuOrdering !== false,
      currency: data.currency === "USD" ? "USD" : "MMK",
    };
  }
}
