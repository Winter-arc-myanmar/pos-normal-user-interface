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
  /** Sales check and deduct stock; off for a business without inventory. */
  trackStock: boolean;
  /**
   * The shop's default taxes as one rate, for taxable products with none of their
   * own: the fractions added up (0.05 for 5%), all inside the price or all on top.
   */
  defaultTaxRate: { id: string; rate: number; isPriceInclusive: boolean } | null;
  /** Service charge in basis points, 1000 for 10%; 0 for none. */
  serviceChargeBps: number;
  serviceChargeOn: { BAR: boolean; SPA: boolean; KTV: boolean };
  /** The default taxes charged on the service charge, added up as a fraction. */
  serviceChargeTaxRate: number;
}

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

const toRates = (data: RecordValue) => {
  const list = Array.isArray(data.defaultTaxRates)
    ? (data.defaultTaxRates as unknown[])
    : data.defaultTaxRate
      ? [data.defaultTaxRate]
      : [];
  return list
    .map(asRecord)
    .filter((rate) => rate.id && Number.isFinite(Number(rate.ratePercentage)));
};

const toDefaultTaxRate = (rates: RecordValue[]): VenueSetting["defaultTaxRate"] => {
  if (!rates.length) return null;
  return {
    id: String(rates[0].id),
    rate: rates.reduce((sum, rate) => sum + Number(rate.ratePercentage), 0),
    isPriceInclusive: rates[0].isPriceInclusive === true,
  };
};

export class ApiVenueSettingRepository {
  constructor(private readonly httpClient: HttpClient) {}

  /** How this business takes payment for SPA and KTV rooms, from Venue setup. */
  async get(): Promise<VenueSetting> {
    const response = asRecord(await this.httpClient.get<unknown>(API_ENDPOINTS.VENUE_SETTINGS.GET));
    const data = asRecord("data" in response ? response.data : response);
    const rates = toRates(data);
    return {
      paymentTiming: data.paymentTiming === "PAY_AT_END" ? "PAY_AT_END" : "PAY_WHEN_ORDERING",
      spaMenuOrdering: data.spaMenuOrdering !== false,
      ktvMenuOrdering: data.ktvMenuOrdering !== false,
      currency: data.currency === "USD" ? "USD" : "MMK",
      trackStock: data.trackStock !== false,
      defaultTaxRate: toDefaultTaxRate(rates),
      serviceChargeBps: Math.max(0, Number(data.serviceChargeBps) || 0),
      serviceChargeOn: {
        BAR: data.serviceChargeOnBar !== false,
        SPA: data.serviceChargeOnSpa !== false,
        KTV: data.serviceChargeOnKtv !== false,
      },
      serviceChargeTaxRate: rates
        .filter((rate) => rate.appliesToServiceCharge === true)
        .reduce((sum, rate) => sum + Number(rate.ratePercentage), 0),
    };
  }
}
