import {
  KtvRoom,
  KtvRoomStatus,
} from "../../domain/entities/Ktv";

export interface KtvRoomFilterDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface KtvRoomListDTO {
  rooms: KtvRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateKtvRoomDTO {
  locationId: string;
  roomNumber: string;
  name: string;
  capacity: number;
  rateVariantId: string;
  minimumMinutes: number;
  incrementMinutes: number;
  graceMinutes: number;
  roundingMode: "UP" | "DOWN" | "NEAREST";
}

export type UpdateKtvRoomDTO = Partial<CreateKtvRoomDTO> & {
  status?: KtvRoomStatus;
};

export interface OpenKtvSessionDTO {
  roomId: string;
  guestCount: number;
  guestWalletId?: string;
  hostUserId?: string;
  posRegisterId?: string;
  openedByPosSessionId?: string;
  salesChannel: "POS";
}

export interface CloseKtvSessionDTO {
  closedAt: string;
}
