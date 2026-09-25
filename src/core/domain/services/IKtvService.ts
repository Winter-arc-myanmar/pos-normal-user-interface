import {
  CloseKtvSessionDTO,
  CreateKtvRoomDTO,
  KtvRoomFilterDTO,
  KtvRoomListDTO,
  OpenKtvSessionDTO,
  UpdateKtvRoomDTO,
} from "../../application/dtos/KtvDTO";
import {
  KtvRoom,
  KtvSession,
  KtvSessionQuote,
  RoomTabletMenu,
  RoomTabletSession,
} from "../entities/Ktv";

export interface IKtvService {
  listRooms(params?: KtvRoomFilterDTO): Promise<KtvRoomListDTO>;
  getBoard(): Promise<KtvRoom[]>;
  getRoom(id: string): Promise<KtvRoom>;
  createRoom(payload: CreateKtvRoomDTO): Promise<KtvRoom>;
  updateRoom(id: string, payload: UpdateKtvRoomDTO): Promise<KtvRoom>;
  deleteRoom(id: string): Promise<KtvRoom>;
  markRoomReady(id: string): Promise<KtvRoom>;
  openSession(payload: OpenKtvSessionDTO): Promise<KtvSession>;
  getQuote(id: string): Promise<KtvSessionQuote>;
  pauseSession(id: string): Promise<KtvSession>;
  resumeSession(id: string): Promise<KtvSession>;
  closeSession(
    id: string,
    payload: CloseKtvSessionDTO
  ): Promise<KtvSessionQuote>;
  getRoomTabletMenu(): Promise<RoomTabletMenu>;
  getRoomTabletSession(): Promise<RoomTabletSession>;
}
