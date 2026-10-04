import {
  KtvRoom,
  KtvRoomStatus,
  KtvSessionQuote,
} from "../../domain/entities/Ktv";
import { RoomOrderCardDTO, SpaCardChargeDTO } from "./SpaDTO";

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
  rateVariantId?: string;
  sessionPrice?: number;
  minimumMinutes?: number;
  incrementMinutes?: number;
  graceMinutes?: number;
  roundingMode?: "UP" | "DOWN" | "NEAREST";
}

export type UpdateKtvRoomDTO = Partial<CreateKtvRoomDTO> & {
  status?: KtvRoomStatus;
};

export interface OpenKtvSessionDTO {
  roomId: string;
  guestCount?: number;
  guestWalletId?: string;
  hostUserId?: string;
  posRegisterId?: string;
  openedByPosSessionId?: string;
  salesChannel: "POS";
  hours?: number;
  items?: { variantId: string; quantity: number }[];
  prepay?: SpaCardChargeDTO;
}

export interface CloseKtvSessionDTO {
  closedAt: string;
}

export interface ExtendKtvSessionDTO extends RoomOrderCardDTO {
  hours: number;
}

export interface ChargeKtvItemsDTO extends RoomOrderCardDTO {
  items: { variantId: string; quantity: number }[];
}

export interface KtvChargeResultDTO {
  charged: string;
  balanceAfter: string;
  quote: KtvSessionQuote;
}
