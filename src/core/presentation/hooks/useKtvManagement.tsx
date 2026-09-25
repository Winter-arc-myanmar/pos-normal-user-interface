import { useCallback, useMemo, useRef, useState } from "react";
import {
  CloseKtvSessionDTO,
  CreateKtvRoomDTO,
  KtvRoomFilterDTO,
  OpenKtvSessionDTO,
  UpdateKtvRoomDTO,
} from "../../application/dtos/KtvDTO";
import {
  KtvRoom,
  KtvSessionQuote,
  RoomTabletMenu,
  RoomTabletSession,
} from "../../domain/entities/Ktv";
import { IKtvService } from "../../domain/services/IKtvService";
import container from "../../infrastructure/di/container";
import { findActiveKtvSession } from "@/lib/ktv/session";

export function useKtvManagement() {
  const service = container.resolve<IKtvService>("ktvService");
  const [rooms, setRooms] = useState<KtvRoom[]>([]);
  const [quote, setQuote] = useState<KtvSessionQuote | null>(null);
  const [roomTabletMenu, setRoomTabletMenu] =
    useState<RoomTabletMenu | null>(null);
  const [roomTabletSession, setRoomTabletSession] =
    useState<RoomTabletSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boardRequestRef = useRef<Promise<KtvRoom[]> | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "KTV request failed");
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBoard = useCallback(async () => {
    if (boardRequestRef.current) return boardRequestRef.current;
    const request = run(async () => {
      const result = await service.getBoard();
      setRooms(result);
      return result;
    }).finally(() => {
      boardRequestRef.current = null;
    });
    boardRequestRef.current = request;
    return request;
  }, [run, service]);

  const listRooms = useCallback(
    (params?: KtvRoomFilterDTO) =>
      run(async () => {
        const result = await service.listRooms(params);
        setRooms(result.rooms);
        return result;
      }),
    [run, service]
  );

  const createRoom = useCallback(
    (payload: CreateKtvRoomDTO) =>
      run(async () => {
        const created = await service.createRoom(payload);
        setRooms((current) => [created, ...current]);
        return created;
      }),
    [run, service]
  );

  const updateRoom = useCallback(
    (id: string, payload: UpdateKtvRoomDTO) =>
      run(async () => {
        const updated = await service.updateRoom(id, payload);
        setRooms((current) =>
          current.map((room) => (room.id === id ? updated : room))
        );
        return updated;
      }),
    [run, service]
  );

  const deleteRoom = useCallback(
    (id: string) =>
      run(async () => {
        const deleted = await service.deleteRoom(id);
        setRooms((current) => current.filter((room) => room.id !== id));
        return deleted;
      }),
    [run, service]
  );

  const markRoomReady = useCallback(
    (id: string) =>
      run(async () => {
        const updated = await service.markRoomReady(id);
        setRooms((current) =>
          current.map((room) => (room.id === id ? updated : room))
        );
        return updated;
      }),
    [run, service]
  );

  const openSession = useCallback(
    (payload: OpenKtvSessionDTO) =>
      run(async () => {
        const session = await service.openSession(payload);
        await fetchBoard();
        return session;
      }),
    [fetchBoard, run, service]
  );

  const getQuote = useCallback(
    (id: string) =>
      run(async () => {
        const result = await service.getQuote(id);
        setQuote(result);
        return result;
      }),
    [run, service]
  );

  const pauseSession = useCallback(
    (id: string) =>
      run(async () => {
        const session = await service.pauseSession(id);
        await fetchBoard();
        return session;
      }),
    [fetchBoard, run, service]
  );

  const resumeSession = useCallback(
    (id: string) =>
      run(async () => {
        const session = await service.resumeSession(id);
        await fetchBoard();
        return session;
      }),
    [fetchBoard, run, service]
  );

  const closeSession = useCallback(
    (id: string, payload: CloseKtvSessionDTO) =>
      run(async () => {
        const result = await service.closeSession(id, payload);
        setQuote(result);
        await fetchBoard();
        return result;
      }),
    [fetchBoard, run, service]
  );

  const fetchRoomTabletMenu = useCallback(
    () =>
      run(async () => {
        const result = await service.getRoomTabletMenu();
        setRoomTabletMenu(result);
        return result;
      }),
    [run, service]
  );

  const fetchRoomTabletSession = useCallback(
    () =>
      run(async () => {
        const result = await service.getRoomTabletSession();
        setRoomTabletSession(result);
        return result;
      }),
    [run, service]
  );

  const activeSessionByRoomId = useMemo(
    () =>
      Object.fromEntries(
        rooms.map((room) => [room.id, findActiveKtvSession(room)])
      ),
    [rooms]
  );

  return {
    rooms,
    quote,
    roomTabletMenu,
    roomTabletSession,
    isLoading,
    error,
    activeSessionByRoomId,
    fetchBoard,
    listRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    markRoomReady,
    openSession,
    getQuote,
    pauseSession,
    resumeSession,
    closeSession,
    fetchRoomTabletMenu,
    fetchRoomTabletSession,
    clearError: () => setError(null),
  };
}
