import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

export type RoomFloorKind = "spa" | "ktv";

/** Where items split off a room's bill go: another room in use, or a free room. */
export type RoomSplitTarget = { sessionId: string } | { roomId: string };

export interface RoomSplitLine {
  lineId: string;
  quantity: number;
}

export interface RoomFloorResult {
  sessionId: string;
  roomId: string;
  targetSessionId?: string;
}

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};

const toResult = (response: unknown): RoomFloorResult => {
  const record = asRecord(response);
  const data = "data" in record ? asRecord(record.data) : record;
  return {
    sessionId: String(data.sessionId || ""),
    roomId: String(data.roomId || ""),
    ...(data.targetSessionId ? { targetSessionId: String(data.targetSessionId) } : {}),
  };
};

const endpoints = (kind: RoomFloorKind) =>
  kind === "ktv" ? API_ENDPOINTS.KTV_SESSIONS : API_ENDPOINTS.SPA_SESSIONS;

/** Guests changing rooms: move the visit, combine two bills, split items off. */
export class ApiRoomFloorRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async move(kind: RoomFloorKind, sessionId: string, roomId: string) {
    return toResult(
      await this.httpClient.post<unknown>(endpoints(kind).MOVE(sessionId), { roomId })
    );
  }

  async merge(kind: RoomFloorKind, sessionId: string, sourceSessionId: string) {
    return toResult(
      await this.httpClient.post<unknown>(endpoints(kind).MERGE(sessionId), {
        sourceSessionId,
      })
    );
  }

  async split(
    kind: RoomFloorKind,
    sessionId: string,
    target: RoomSplitTarget,
    lines: RoomSplitLine[],
    till: { posRegisterId?: string; openedByPosSessionId?: string } = {}
  ) {
    return toResult(
      await this.httpClient.post<unknown>(endpoints(kind).SPLIT(sessionId), {
        ...("sessionId" in target
          ? { targetSessionId: target.sessionId }
          : { targetRoomId: target.roomId }),
        lines,
        ...(till.posRegisterId ? { posRegisterId: till.posRegisterId } : {}),
        ...(till.openedByPosSessionId
          ? { openedByPosSessionId: till.openedByPosSessionId }
          : {}),
      })
    );
  }
}
