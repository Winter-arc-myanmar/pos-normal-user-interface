import type { TableChargeOffer, TableCharges } from "../../domain/entities/TableCharge";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

const unwrap = (response: unknown): RecordValue => {
  const record = asRecord(response);
  return "data" in record && !("offered" in record) ? unwrap(record.data) : record;
};

const toCharges = (response: unknown): TableCharges => {
  const body = unwrap(response);
  const offered = Array.isArray(body.offered) ? body.offered : [];
  const running = Array.isArray(body.running) ? body.running : [];
  return {
    offered: offered.map((row): TableChargeOffer => {
      const item = asRecord(row);
      return {
        variantId: String(item.variantId || ""),
        name: String(item.name || ""),
        unitPrice: Number(item.unitPrice || 0),
        soldBy: item.soldBy === "TIME" ? "TIME" : "EACH",
        timeBlockMinutes: item.timeBlockMinutes == null ? null : Number(item.timeBlockMinutes),
        minimumBlocks: item.minimumBlocks == null ? null : Number(item.minimumBlocks),
        chargeMode: item.chargeMode === "CLOCK" ? "CLOCK" : item.chargeMode === "PAY_FIRST" ? "PAY_FIRST" : null,
        autoApply: Boolean(item.autoApply),
      };
    }),
    running: running.map((row) => {
      const item = asRecord(row);
      return {
        variantId: String(item.variantId || ""),
        name: String(item.name || ""),
        startedAt: String(item.startedAt || ""),
      };
    }),
  };
};

/** A table's charges at the till: what it offers, adding one, stopping clocks. */
export class ApiTableChargeRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async get(sessionId: string): Promise<TableCharges> {
    return toCharges(await this.httpClient.get<unknown>(API_ENDPOINTS.TABLE_SESSIONS.CHARGES(sessionId)));
  }

  async add(sessionId: string, variantId: string, units?: number): Promise<TableCharges> {
    return toCharges(
      await this.httpClient.post<unknown>(API_ENDPOINTS.TABLE_SESSIONS.CHARGES(sessionId), {
        variantId,
        ...(units ? { units } : {}),
      })
    );
  }

  /** Stops one clock, or every clock when no charge is named. */
  async stop(sessionId: string, variantId?: string): Promise<TableCharges> {
    return toCharges(
      await this.httpClient.post<unknown>(
        API_ENDPOINTS.TABLE_SESSIONS.CHARGES_STOP(sessionId),
        variantId ? { variantId } : {}
      )
    );
  }
}
