import { useMemo } from "react";
import container from "../../infrastructure/di/container";
import type {
  ApiRoomFloorRepository,
  RoomFloorKind,
  RoomSplitLine,
  RoomSplitTarget,
} from "../../infrastructure/repositories/ApiRoomFloorRepository";

/** Move, combine and split for SPA and KTV rooms. */
export function useRoomFloor(kind: RoomFloorKind) {
  return useMemo(() => {
    const repository = () => container.resolve<ApiRoomFloorRepository>("roomFloorRepository");
    return {
      moveRoom: (sessionId: string, roomId: string) => repository().move(kind, sessionId, roomId),
      mergeRoom: (sessionId: string, sourceSessionId: string) =>
        repository().merge(kind, sessionId, sourceSessionId),
      splitRoom: (
        sessionId: string,
        target: RoomSplitTarget,
        lines: RoomSplitLine[],
        till?: { posRegisterId?: string; openedByPosSessionId?: string }
      ) => repository().split(kind, sessionId, target, lines, till),
    };
  }, [kind]);
}
