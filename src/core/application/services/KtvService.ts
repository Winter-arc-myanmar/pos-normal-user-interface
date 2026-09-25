import {
  CloseKtvSessionDTO,
  CreateKtvRoomDTO,
  KtvRoomFilterDTO,
  KtvRoomListDTO,
  OpenKtvSessionDTO,
  UpdateKtvRoomDTO,
} from "../dtos/KtvDTO";
import {
  KtvRoom,
  KtvSession,
  KtvSessionQuote,
  RoomTabletMenu,
  RoomTabletSession,
} from "../../domain/entities/Ktv";
import { IKtvRepository } from "../../domain/repositories/IKtvRepository";
import { IKtvService } from "../../domain/services/IKtvService";

const requireId = (value: string, label: string) => {
  if (!value.trim()) throw new Error(`${label} is required`);
};

export class KtvService implements IKtvService {
  constructor(private repository: IKtvRepository) {}

  listRooms(params?: KtvRoomFilterDTO): Promise<KtvRoomListDTO> {
    return this.repository.listRooms(params);
  }

  getBoard(): Promise<KtvRoom[]> {
    return this.repository.getBoard();
  }

  getRoom(id: string): Promise<KtvRoom> {
    requireId(id, "Room ID");
    return this.repository.getRoom(id);
  }

  createRoom(payload: CreateKtvRoomDTO): Promise<KtvRoom> {
    requireId(payload.locationId, "Location");
    requireId(payload.roomNumber, "Room number");
    requireId(payload.name, "Room name");
    requireId(payload.rateVariantId, "Rate variant");
    if (payload.capacity < 1) throw new Error("Room capacity must be at least 1");
    if (payload.minimumMinutes < 1 || payload.incrementMinutes < 1) {
      throw new Error("Room billing minutes must be greater than zero");
    }
    return this.repository.createRoom(payload);
  }

  updateRoom(id: string, payload: UpdateKtvRoomDTO): Promise<KtvRoom> {
    requireId(id, "Room ID");
    return this.repository.updateRoom(id, payload);
  }

  deleteRoom(id: string): Promise<KtvRoom> {
    requireId(id, "Room ID");
    return this.repository.deleteRoom(id);
  }

  markRoomReady(id: string): Promise<KtvRoom> {
    requireId(id, "Room ID");
    return this.repository.markRoomReady(id);
  }

  openSession(payload: OpenKtvSessionDTO): Promise<KtvSession> {
    requireId(payload.roomId, "Room");
    if (payload.guestCount < 1) {
      throw new Error("Guest count must be at least 1");
    }
    return this.repository.openSession(payload);
  }

  getQuote(id: string): Promise<KtvSessionQuote> {
    requireId(id, "Session ID");
    return this.repository.getQuote(id);
  }

  pauseSession(id: string): Promise<KtvSession> {
    requireId(id, "Session ID");
    return this.repository.pauseSession(id);
  }

  resumeSession(id: string): Promise<KtvSession> {
    requireId(id, "Session ID");
    return this.repository.resumeSession(id);
  }

  closeSession(
    id: string,
    payload: CloseKtvSessionDTO
  ): Promise<KtvSessionQuote> {
    requireId(id, "Session ID");
    if (!payload.closedAt.trim()) throw new Error("Close time is required");
    return this.repository.closeSession(id, payload);
  }

  getRoomTabletMenu(): Promise<RoomTabletMenu> {
    return this.repository.getRoomTabletMenu();
  }

  getRoomTabletSession(): Promise<RoomTabletSession> {
    return this.repository.getRoomTabletSession();
  }
}
