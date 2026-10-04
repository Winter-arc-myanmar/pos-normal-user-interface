import {
  SpaRoomStatus,
  SpaRoundingMode,
  SpaSessionQuote,
} from "../../domain/entities/Spa";

export interface CreateSpaRoomDTO {
  locationId: string;
  roomNumber: string;
  name: string;
  capacity: number;
  rateVariantId?: string;
  sessionPrice?: number;
  minimumMinutes?: number;
  incrementMinutes?: number;
  graceMinutes?: number;
  roundingMode?: SpaRoundingMode;
}

export type UpdateSpaRoomDTO = Partial<Omit<CreateSpaRoomDTO, "locationId">> & {
  status?: SpaRoomStatus;
};

export interface SpaCardChargeDTO {
  guestCardId: string;
  paymentMethodId: string;
  posSessionId?: string;
  idempotencyKey?: string;
}

export interface OpenSpaSessionDTO {
  roomId: string;
  guestWalletId?: string;
  guestCount?: number;
  plannedMinutes?: number;
  sessions?: number;
  /** SPA: the service packages booked; their time is the treatment's. */
  packages?: { packageId: string; quantity: number }[];
  items?: { variantId: string; quantity: number }[];
  prepay?: SpaCardChargeDTO;
  posRegisterId?: string;
  openedByPosSessionId?: string;
  salesChannel?: "POS";
}

/**
 * The card on an order into a running room: required when the venue takes payment
 * when ordering, left out when it takes payment at the end.
 */
export interface RoomOrderCardDTO {
  guestCardId?: string;
  paymentMethodId?: string;
  posSessionId?: string;
  idempotencyKey?: string;
}

export interface ExtendSpaSessionDTO extends RoomOrderCardDTO {
  /** KTV: hours. */
  sessions?: number;
  /** SPA: more service packages. */
  packages?: { packageId: string; quantity: number }[];
}

export interface ChargeSpaItemsDTO extends RoomOrderCardDTO {
  items: { variantId: string; quantity: number }[];
}

export interface GiveFreeItemsDTO {
  items: { variantId: string; quantity: number }[];
  compReasonId?: string;
  reason?: string;
}

export interface SpaChargeResultDTO {
  charged: string;
  balanceAfter: string;
  quote: SpaSessionQuote;
}

export interface CloseSpaSessionDTO {
  closedAt?: string;
}
