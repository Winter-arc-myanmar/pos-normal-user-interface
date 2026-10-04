import { useMemo } from "react";
import {
  ChargeSpaItemsDTO,
  CloseSpaSessionDTO,
  CreateSpaRoomDTO,
  ExtendSpaSessionDTO,
  GiveFreeItemsDTO,
  OpenSpaSessionDTO,
  SpaChargeResultDTO,
  UpdateSpaRoomDTO,
} from "../../application/dtos/SpaDTO";
import { KtvChargeResultDTO } from "../../application/dtos/KtvDTO";
import {
  KtvRoom,
  KtvSession,
  KtvSessionQuote,
} from "../../domain/entities/Ktv";
import { SpaRoom, SpaSession, SpaSessionQuote } from "../../domain/entities/Spa";
import { useKtvManagement } from "./useKtvManagement";
import { useSpaManagement } from "./useSpaManagement";

export type RoomKind = "spa" | "ktv";

/** A KTV room is sold by the hour, so an hour is its session. */
const KTV_SESSION_MINUTES = 60;

const fromKtvSession = (session: KtvSession): SpaSession =>
  new SpaSession({
    id: session.id,
    tenantId: session.tenantId,
    roomId: session.roomId,
    guestWalletId: session.guestWalletId,
    guestCount: session.guestCount,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    pausedMinutes: session.pausedMinutes,
    pausedAt: session.pausedAt,
    salesOrderId: session.salesOrderId,
    sessionState: session.sessionState,
    posRegisterId: session.posRegisterId,
    openedByPosSessionId: session.openedByPosSessionId,
    plannedMinutes: session.plannedMinutes,
    endsAt: session.endsAt,
  });

const fromKtvRoom = (room: KtvRoom): SpaRoom =>
  new SpaRoom({
    id: room.id,
    tenantId: room.tenantId,
    locationId: room.locationId,
    roomNumber: room.roomNumber,
    name: room.name,
    capacity: room.capacity,
    rateVariantId: room.rateVariantId,
    sessionPrice: room.priceNow ?? room.sessionPrice,
    rateProductId: room.rateProductId,
    minimumMinutes: KTV_SESSION_MINUTES,
    incrementMinutes: KTV_SESSION_MINUTES,
    graceMinutes: room.graceMinutes,
    roundingMode: room.roundingMode,
    status:
      room.status === "IN_USE" || room.status === "PAUSED" ? "OCCUPIED" : room.status,
    sessions: room.sessions.map(fromKtvSession),
  });

const fromKtvQuote = (quote: KtvSessionQuote): SpaSessionQuote =>
  new SpaSessionQuote({
    sessionId: quote.sessionId,
    roomId: quote.roomId,
    roomNumber: quote.roomNumber,
    state: quote.state,
    openedAt: quote.openedAt,
    asOf: quote.asOf,
    elapsedMinutes: quote.elapsedMinutes,
    pausedMinutes: quote.pausedMinutes,
    treatmentCharge: quote.roomCharge,
    servicesCharge: quote.fnbCharge,
    runningTotal: quote.runningTotal,
    prepaid: quote.prepaid,
    paidTotal: quote.paidTotal,
    paymentTiming: quote.paymentTiming,
    amountDue: quote.amountDue,
  });

const fromKtvCharge = (result: KtvChargeResultDTO): SpaChargeResultDTO => ({
  charged: result.charged,
  balanceAfter: result.balanceAfter,
  quote: fromKtvQuote(result.quote),
});

const ktvRoomTerms = (payload: UpdateSpaRoomDTO) => ({
  ...(payload.roomNumber !== undefined && { roomNumber: payload.roomNumber }),
  ...(payload.name !== undefined && { name: payload.name }),
  ...(payload.capacity !== undefined && { capacity: payload.capacity }),
  ...(payload.sessionPrice !== undefined && { sessionPrice: payload.sessionPrice }),
  ...(payload.status !== undefined && { status: payload.status }),
});

/**
 * One room POS for spa treatments and KTV rooms: both are paid as they go, so the
 * board works the same, and a KTV room is presented in the spa's shape with an
 * hour as its session.
 */
export function useRoomPos(kind: RoomKind) {
  const spa = useSpaManagement();
  const ktv = useKtvManagement();

  const ktvRooms = useMemo(() => ktv.rooms.map(fromKtvRoom), [ktv.rooms]);
  const ktvQuote = useMemo(
    () => (ktv.quote ? fromKtvQuote(ktv.quote) : null),
    [ktv.quote]
  );

  const {
    fetchBoard: ktvFetchBoard,
    createRoom: ktvCreateRoom,
    updateRoom: ktvUpdateRoom,
    deleteRoom: ktvDeleteRoom,
    markRoomReady: ktvMarkRoomReady,
    openSession: ktvOpenSession,
    getQuote: ktvGetQuote,
    pauseSession: ktvPauseSession,
    resumeSession: ktvResumeSession,
    closeSession: ktvCloseSession,
    extendSession: ktvExtendSession,
    chargeItems: ktvChargeItems,
    giveFree: ktvGiveFree,
    refundLine: ktvRefundLine,
    clearQuote: ktvClearQuote,
  } = ktv;

  const ktvActions = useMemo(
    () => ({
      fetchBoard: async () => (await ktvFetchBoard()).map(fromKtvRoom),
      createRoom: async (payload: CreateSpaRoomDTO) =>
        fromKtvRoom(
          await ktvCreateRoom({
            locationId: payload.locationId,
            roomNumber: payload.roomNumber,
            name: payload.name,
            capacity: payload.capacity,
            sessionPrice: payload.sessionPrice,
          })
        ),
      updateRoom: async (id: string, payload: UpdateSpaRoomDTO) =>
        fromKtvRoom(await ktvUpdateRoom(id, ktvRoomTerms(payload))),
      deleteRoom: async (id: string) => fromKtvRoom(await ktvDeleteRoom(id)),
      markRoomReady: async (id: string) => fromKtvRoom(await ktvMarkRoomReady(id)),
      openSession: async (payload: OpenSpaSessionDTO) =>
        fromKtvSession(
          await ktvOpenSession({
            roomId: payload.roomId,
            guestWalletId: payload.guestWalletId,
            guestCount: payload.guestCount,
            hours: payload.sessions,
            items: payload.items,
            prepay: payload.prepay,
            posRegisterId: payload.posRegisterId,
            openedByPosSessionId: payload.openedByPosSessionId,
            salesChannel: "POS",
          })
        ),
      getQuote: async (id: string) => fromKtvQuote(await ktvGetQuote(id)),
      pauseSession: async (id: string) => fromKtvSession(await ktvPauseSession(id)),
      resumeSession: async (id: string) => fromKtvSession(await ktvResumeSession(id)),
      closeSession: async (id: string, payload: CloseSpaSessionDTO) =>
        fromKtvQuote(
          await ktvCloseSession(id, {
            closedAt: payload.closedAt || new Date().toISOString(),
          })
        ),
      extendSession: async (id: string, payload: ExtendSpaSessionDTO) => {
        const { guestCardId, paymentMethodId, posSessionId, idempotencyKey, sessions } = payload;
        return fromKtvCharge(
          await ktvExtendSession(id, {
            guestCardId,
            paymentMethodId,
            posSessionId,
            idempotencyKey,
            hours: sessions || 1,
          })
        );
      },
      chargeItems: async (id: string, payload: ChargeSpaItemsDTO) =>
        fromKtvCharge(await ktvChargeItems(id, payload)),
      giveFree: async (id: string, payload: GiveFreeItemsDTO) =>
        fromKtvCharge(await ktvGiveFree(id, payload)),
      refundLine: async (id: string, lineId: string, reason?: string) =>
        fromKtvCharge(await ktvRefundLine(id, lineId, reason)),
      clearQuote: ktvClearQuote,
    }),
    [
      ktvFetchBoard,
      ktvCreateRoom,
      ktvUpdateRoom,
      ktvDeleteRoom,
      ktvMarkRoomReady,
      ktvOpenSession,
      ktvGetQuote,
      ktvPauseSession,
      ktvResumeSession,
      ktvCloseSession,
      ktvExtendSession,
      ktvChargeItems,
      ktvGiveFree,
      ktvRefundLine,
      ktvClearQuote,
    ]
  );

  if (kind === "spa") return spa;
  return {
    rooms: ktvRooms,
    quote: ktvQuote,
    isLoading: ktv.isLoading,
    error: ktv.error,
    ...ktvActions,
  };
}
