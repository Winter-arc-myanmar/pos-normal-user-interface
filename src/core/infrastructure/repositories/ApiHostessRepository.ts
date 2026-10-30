import type { Hostess } from "../../domain/entities/Hostess";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

const listOf = (response: unknown): unknown[] => {
  const record = asRecord(response);
  if (Array.isArray(response)) return response;
  if ("data" in record) return listOf(record.data);
  return [];
};

export class ApiHostessRepository {
  constructor(private readonly httpClient: HttpClient) {}

  /** The hostesses at work now, by their schedule or already in a room, each with the room she is in. */
  async working(): Promise<Hostess[]> {
    const response = await this.httpClient.get<unknown>(API_ENDPOINTS.HOSTESSES.LIST, {
      params: { activeOnly: "true", onDuty: "true", limit: 100 },
    });
    return listOf(response).map((row) => {
      const item = asRecord(row);
      const inRoom = asRecord(item.inRoom);
      return {
        id: String(item.id || ""),
        name: String(item.name || ""),
        nickname: item.nickname ? String(item.nickname) : null,
        inRoom: inRoom.roomNumber
          ? {
              roomNumber: String(inRoom.roomNumber),
              ...(inRoom.roomId ? { roomId: String(inRoom.roomId) } : {}),
              ...(inRoom.since ? { since: String(inRoom.since) } : {}),
              until: inRoom.until ? String(inRoom.until) : null,
            }
          : null,
      };
    });
  }
}
