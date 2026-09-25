import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { findMemberCardPaymentMethod } from "@/core/application/services/PosPaymentCatalog";
import { KtvRoom, KtvSession } from "@/core/domain/entities/Ktv";
import { GuestCard, GuestWallet } from "@/core/domain/entities/GuestWallet";
import { useCashier } from "@/core/presentation/hooks/useCashier";
import { useGuestWalletManagement } from "@/core/presentation/hooks/useGuestWalletManagement";
import { useKtvManagement } from "@/core/presentation/hooks/useKtvManagement";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useSalesOrderManagement } from "@/core/presentation/hooks/useSalesOrderManagement";
import {
  findActiveKtvSession,
  getKtvWarning,
  hasSufficientWalletBalance,
  isOpenKtvSession,
} from "@/lib/ktv/session";
import { isUnspendableWalletStatus } from "@/lib/pos/guestWalletAmounts";
import { ProductMenu } from "./cashier/ProductMenu";
import { KtvRoomTile } from "./ktv/KtvRoomTile";

type CounterStep = "card" | "rooms" | "sessions" | "menu" | "pay";

const emptyRoomForm = {
  roomNumber: "",
  name: "",
  capacity: "4",
  rateVariantId: "",
  minimumMinutes: "60",
  incrementMinutes: "30",
  graceMinutes: "5",
  roundingMode: "UP" as "UP" | "DOWN" | "NEAREST",
};

export function KtvBoardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    rooms,
    quote,
    isLoading,
    error,
    fetchBoard,
    createRoom,
    updateRoom,
    deleteRoom,
    markRoomReady,
    openSession,
    getQuote,
    closeSession,
  } = useKtvManagement();
  const {
    products,
    variantsByProductId,
    paymentMethods,
    fetchProducts,
    fetchProductVariants,
    fetchPaymentMethods,
    processCheckout,
  } = useCashier();
  const {
    orderLines,
    fetchOrderLines,
    addOrderLine,
    deleteOrderLine,
  } = useSalesOrderManagement();
  const { lookupCard, getWallet } = useGuestWalletManagement();
  const { activeLocationId, requireCashierContext, isWorkspaceReady } =
    usePosWorkspace();
  const [step, setStep] = useState<CounterStep>("card");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [filter, setFilter] = useState<"ALL" | "AVAILABLE" | "ACTIVE">("ALL");
  const [selectedRoom, setSelectedRoom] = useState<KtvRoom | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [cardUid, setCardUid] = useState("");
  const [card, setCard] = useState<GuestCard | null>(null);
  const [wallet, setWallet] = useState<GuestWallet | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastAddedLineId, setLastAddedLineId] = useState<string | null>(null);
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<KtvRoom | null>(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);

  useEffect(() => {
    void fetchBoard();
    void fetchProducts({ page: 1, limit: 100 });
    void fetchPaymentMethods();
  }, [fetchBoard, fetchPaymentMethods, fetchProducts]);

  useEffect(() => {
    const returned = location.state as { cardNumber?: string } | null;
    if (!returned?.cardNumber) return;
    setCardUid(returned.cardNumber);
    void lookupCard(returned.cardNumber)
      .then(async (foundCard) => {
        const foundWallet =
          foundCard.wallet || (await getWallet(foundCard.walletId));
        setCard(foundCard);
        setWallet(foundWallet);
        setStep("rooms");
      })
      .catch(() => setActionError(t("ktv.errors.cardLookup")));
  }, [getWallet, location.state, lookupCard, t]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchBoard();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [fetchBoard]);

  const room =
    rooms.find((item) => item.id === selectedRoom?.id) || selectedRoom;
  const openSessions = useMemo(
    () => (room?.sessions || []).filter(isOpenKtvSession),
    [room?.sessions]
  );
  const session =
    openSessions.find((item) => item.id === selectedSessionId) || null;
  const paymentMethod = findMemberCardPaymentMethod(paymentMethods);
  const visibleRooms = useMemo(
    () =>
      rooms.filter((item) => {
        const active = Boolean(findActiveKtvSession(item));
        if (filter === "ACTIVE") return active;
        if (filter === "AVAILABLE") {
          return !active && item.status === "AVAILABLE";
        }
        return true;
      }),
    [filter, rooms]
  );

  const handleCardLookup = async (uid = cardUid) => {
    setActionError(null);
    try {
      const foundCard = await lookupCard(uid.trim());
      const foundWallet =
        foundCard.wallet || (await getWallet(foundCard.walletId));
      if (isUnspendableWalletStatus(foundWallet.status)) {
        throw new Error(t("ktv.errors.walletUnavailable"));
      }
      setCard(foundCard);
      setWallet(foundWallet);
      setCardUid(foundCard.cardUid);
      setNotice(t("ktv.cardAccepted"));
    } catch (caught) {
      setCard(null);
      setWallet(null);
      setActionError(
        caught instanceof Error ? caught.message : t("ktv.errors.cardLookup")
      );
    }
  };

  const openTopup = () => {
    if (!card || !wallet) return;
    navigate("/cards", {
      state: {
        cardNumber: card.cardUid,
        balance: wallet.balance,
        customerName: wallet.guestName,
        customerPhone: wallet.guestPhone,
        tenantId: wallet.tenantId,
        walletId: wallet.id,
        returnTo: "/ktv",
      },
    });
  };

  const selectRoom = (nextRoom: KtvRoom) => {
    setSelectedRoom(nextRoom);
    setSelectedSessionId("");
    setGuestCount("1");
    setStep("sessions");
  };

  const selectSession = async (nextSession: KtvSession) => {
    if (nextSession.guestWalletId && wallet && nextSession.guestWalletId !== wallet.id) {
      setActionError(t("ktv.errors.wrongSessionCard"));
      return;
    }
    setSelectedSessionId(nextSession.id);
    setActionError(null);
    await Promise.all([
      getQuote(nextSession.id),
      nextSession.salesOrderId
        ? fetchOrderLines(nextSession.salesOrderId, { page: 1, limit: 200 })
        : Promise.resolve(),
    ]);
    const latest = await getQuote(nextSession.id);
    if (wallet && !hasSufficientWalletBalance(wallet.balance, latest.runningTotal)) {
      setShowInsufficient(true);
    }
    setStep("menu");
  };

  const handleOpenSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!room || !wallet) return;
    setActionError(null);
    try {
      const context = await requireCashierContext();
      const created = await openSession({
        roomId: room.id,
        guestCount: Math.max(1, Number(guestCount) || 1),
        guestWalletId: wallet.id,
        posRegisterId: context.posRegisterId,
        openedByPosSessionId: context.posSessionId,
        salesChannel: "POS",
      });
      const board = await fetchBoard();
      const refreshed = board.find((item) => item.id === room.id);
      if (refreshed) setSelectedRoom(refreshed);
      await selectSession(created);
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : t("ktv.errors.openSession")
      );
    }
  };

  const handleAddProduct = async (
    product: (typeof products)[number],
    variantId: string,
    quantity: number
  ) => {
    if (!session?.salesOrderId || !wallet) {
      throw new Error(t("ktv.errors.sessionRequired"));
    }
    const variants = variantsByProductId[product.id]?.length
      ? variantsByProductId[product.id]
      : await fetchProductVariants(product.id);
    const variant = variants.find((item) => item.id === variantId) || variants[0];
    if (!variant) throw new Error(t("cashier.productMenu.noVariant"));
    const unitPrice =
      Number(product.basePrice || 0) + Number(variant.priceModifier || 0);
    const line = await addOrderLine(session.salesOrderId, {
      variantId: variant.id,
      quantity: Math.max(1, quantity).toFixed(4),
      unitPrice: unitPrice.toFixed(4),
      lineDiscount: "0.0000",
    });
    setLastAddedLineId(line.id);
    const nextQuote = await getQuote(session.id);
    if (!hasSufficientWalletBalance(wallet.balance, nextQuote.runningTotal)) {
      setShowInsufficient(true);
    } else {
      setNotice(t("ktv.itemAdded"));
    }
  };

  const removeLastItem = async () => {
    if (!lastAddedLineId || !session?.salesOrderId) {
      setShowInsufficient(false);
      return;
    }
    await deleteOrderLine(session.salesOrderId, lastAddedLineId);
    setLastAddedLineId(null);
    setShowInsufficient(false);
    await getQuote(session.id);
  };

  const handleCheckout = async () => {
    if (!session?.salesOrderId || !card || !wallet || !paymentMethod) {
      setActionError(t("ktv.errors.paymentUnavailable"));
      return;
    }
    const latestQuote = await getQuote(session.id);
    if (!hasSufficientWalletBalance(wallet.balance, latestQuote.runningTotal)) {
      setShowInsufficient(true);
      return;
    }
    const finalQuote = await closeSession(session.id, {
      closedAt: new Date().toISOString(),
    });
    const result = await fetchOrderLines(session.salesOrderId, {
      page: 1,
      limit: 200,
    });
    const context = await requireCashierContext();
    await processCheckout({
      tenantId: context.tenantId,
      locationId: context.locationId,
      posSessionId: context.posSessionId,
      salesChannel: "POS",
      serviceType: "DINE_IN",
      idempotencyKey: `ktv-${session.id}-${Date.now()}`,
      items: result.lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        lineDiscount: line.lineDiscount || "0.0000",
      })),
      payments: [
        {
          paymentMethodId: paymentMethod.id,
          amount: Number(finalQuote.runningTotal || 0).toFixed(4),
          guestCardId: card.id,
        },
      ],
    });
    setStep("rooms");
    setSelectedSessionId("");
    await fetchBoard();
    await getWallet(wallet.id);
  };

  const handleCreateRoom = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeLocationId) return;
    setActionError(null);
    try {
      const payload = {
        locationId: activeLocationId,
        roomNumber: roomForm.roomNumber.trim(),
        name: roomForm.name.trim(),
        capacity: Number(roomForm.capacity),
        rateVariantId: roomForm.rateVariantId.trim(),
        minimumMinutes: Number(roomForm.minimumMinutes),
        incrementMinutes: Number(roomForm.incrementMinutes),
        graceMinutes: Number(roomForm.graceMinutes),
        roundingMode: roomForm.roundingMode,
      };
      if (editingRoom) await updateRoom(editingRoom.id, payload);
      else await createRoom(payload);
      setRoomForm(emptyRoomForm);
      setEditingRoom(null);
      setShowRoomForm(false);
      await fetchBoard();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : t("ktv.errors.createRoom")
      );
    }
  };

  const openRoomManager = (managed: KtvRoom) => {
    setEditingRoom(managed);
    setRoomForm({
      roomNumber: managed.roomNumber,
      name: managed.name,
      capacity: String(managed.capacity),
      rateVariantId: managed.rateVariantId,
      minimumMinutes: String(managed.minimumMinutes),
      incrementMinutes: String(managed.incrementMinutes),
      graceMinutes: String(managed.graceMinutes),
      roundingMode: managed.roundingMode,
    });
    setShowRoomForm(true);
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#080808] p-4 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h1 className="text-xl font-bold">{t("ktv.boardTitle")}</h1>
          <p className="text-sm text-slate-400">{t(`ktv.steps.${step}`)}</p>
        </div>
        <div className="flex gap-2">
          {step !== "card" ? (
            <Button
              variant="secondary"
              onClick={() =>
                setStep(
                  step === "pay"
                    ? "menu"
                    : step === "menu"
                      ? "sessions"
                      : step === "sessions"
                        ? "rooms"
                        : "card"
                )
              }
            >
              {t("cardTopup.back")}
            </Button>
          ) : null}
          <Button
            disabled={!isWorkspaceReady}
            onClick={() => {
              setEditingRoom(null);
              setRoomForm(emptyRoomForm);
              setShowRoomForm(true);
            }}
          >
            {t("ktv.addRoom")}
          </Button>
        </div>
      </header>

      {(error || actionError || notice) && (
        <p
          className={`my-3 rounded border p-3 text-sm ${
            actionError || error
              ? "border-red-500/60 bg-red-950/50 text-red-200"
              : "border-emerald-500/60 bg-emerald-950/40 text-emerald-200"
          }`}
        >
          {actionError || error || notice}
        </p>
      )}

      {step === "card" ? (
        <form
          className="mx-auto mt-10 w-full max-w-md space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCardLookup();
          }}
        >
          <h2 className="text-2xl font-bold">{t("ktv.counterCardTitle")}</h2>
          <input
            value={cardUid}
            onChange={(event) => setCardUid(event.target.value)}
            placeholder={t("ktv.cardUid")}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-3"
          />
          <Button fullWidth type="submit" disabled={!cardUid.trim()}>
            {t("ktv.checkCard")}
          </Button>
          {wallet && card ? (
            <div className="rounded border border-slate-700 p-4">
              <p>{wallet.guestName}</p>
              <p className="text-emerald-300">
                {t("ktv.balance", { amount: wallet.balance })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={openTopup}>
                  {t("ktv.topUpCard")}
                </Button>
                <Button onClick={() => setStep("rooms")}>{t("ktv.selectRoom")}</Button>
              </div>
            </div>
          ) : null}
        </form>
      ) : null}

      {step === "rooms" ? (
        <>
          <div className="my-3 flex gap-2">
            {(["ALL", "AVAILABLE", "ACTIVE"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  filter === value ? "bg-blue-600" : "bg-slate-800"
                }`}
                onClick={() => setFilter(value)}
              >
                {t(`ktv.filters.${value.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {visibleRooms.map((item) => (
                <KtvRoomTile
                  key={item.id}
                  room={item}
                  nowMs={nowMs}
                  onSelect={() => selectRoom(item)}
                  onReady={() => void markRoomReady(item.id)}
                  onManage={() => openRoomManager(item)}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {step === "sessions" && room ? (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {openSessions.map((item) => {
            const warning = getKtvWarning(item.endsAt, nowMs);
            return (
              <button
                key={item.id}
                type="button"
                className={`rounded-lg border p-4 text-left ${
                  warning.level === "EXPIRED"
                    ? "border-red-500 bg-red-950/50"
                    : warning.level === "WARNING"
                      ? "border-orange-400 bg-orange-950/40"
                      : "border-slate-700 bg-slate-900"
                }`}
                onClick={() => void selectSession(item)}
              >
                <p className="text-lg font-bold">{room.roomNumber}</p>
                <p className="text-sm text-slate-300">
                  {t("ktv.sessionOption", {
                    time: new Date(item.openedAt).toLocaleTimeString(),
                  })}
                </p>
                <p className="mt-2 text-sm">
                  {warning.level === "EXPIRED"
                    ? t("ktv.expired")
                    : item.endsAt
                      ? t("ktv.minutesRemaining", {
                          count: warning.remainingMinutes,
                        })
                      : item.sessionState}
                </p>
              </button>
            );
          })}
          {room.status === "AVAILABLE" || openSessions.length === 0 ? (
            <form
              className="space-y-3 rounded-lg border border-blue-500 bg-slate-900 p-4"
              onSubmit={handleOpenSession}
            >
              <p className="font-bold">{t("ktv.newSession")}</p>
              <input
                type="number"
                min={1}
                max={room.capacity}
                value={guestCount}
                onChange={(event) => setGuestCount(event.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              />
              <Button type="submit" isLoading={isLoading}>
                {t("ktv.startSession")}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {step === "menu" || step === "pay" ? (
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-[18rem_minmax(0,1fr)] gap-4">
          <aside className="space-y-3">
            <p className="text-emerald-300">
              {t("ktv.balance", { amount: wallet?.balance || "0.0000" })}
            </p>
            <p>{t("ktv.runningTotal", { amount: quote?.runningTotal || "0.0000" })}</p>
            {orderLines.map((line) => (
              <div key={line.id} className="flex justify-between text-sm">
                <span>{line.productName || line.variantId.slice(0, 8)}</span>
                <span>{Number(line.quantity)}</span>
              </div>
            ))}
            <Button onClick={() => setStep("pay")}>{t("ktv.pay")}</Button>
          </aside>
          {step === "menu" ? (
            <ProductMenu
              products={products}
              variantsByProductId={variantsByProductId}
              onLoadVariants={fetchProductVariants}
              onAdd={handleAddProduct}
              onClose={() => setStep("pay")}
            />
          ) : (
            <div className="rounded-lg border border-slate-700 p-5">
              <h2 className="text-lg font-bold">{t("ktv.confirmCheckout")}</h2>
              <p className="mt-3">{t("ktv.roomCharge", { amount: quote?.roomCharge || "0" })}</p>
              <p>{t("ktv.fnbCharge", { amount: quote?.fnbCharge || "0" })}</p>
              <Button className="mt-4" isLoading={isLoading} onClick={() => void handleCheckout()}>
                {t("ktv.confirmPay")}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {showInsufficient ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-lg border border-orange-400 bg-slate-950 p-5">
            <h2 className="text-lg font-bold text-orange-300">{t("ktv.insufficientTitle")}</h2>
            <p className="mt-2 text-sm text-slate-300">{t("ktv.insufficientDescription")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => void removeLastItem()}>
                {t("ktv.removeLastItem")}
              </Button>
              <Button onClick={openTopup}>{t("ktv.topUpCard")}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {showRoomForm ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <form
            className="grid w-full max-w-2xl grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-950 p-5"
            onSubmit={handleCreateRoom}
          >
            <h2 className="col-span-2 text-lg font-bold">
              {editingRoom ? t("ktv.editRoom") : t("ktv.addRoom")}
            </h2>
            {(
              [
                ["roomNumber", "ktv.roomNumber"],
                ["name", "ktv.roomName"],
                ["capacity", "ktv.capacityLabel"],
                ["rateVariantId", "ktv.rateVariant"],
                ["minimumMinutes", "ktv.minimumMinutes"],
                ["incrementMinutes", "ktv.incrementMinutes"],
                ["graceMinutes", "ktv.graceMinutes"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                {t(label)}
                <input
                  value={roomForm[key]}
                  onChange={(event) =>
                    setRoomForm((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                  required
                />
              </label>
            ))}
            <div className="col-span-2 flex justify-end gap-2">
              {editingRoom ? (
                <Button
                  variant="destructive"
                  disabled={Boolean(findActiveKtvSession(editingRoom))}
                  onClick={() => void deleteRoom(editingRoom.id)}
                >
                  {t("ktv.retireRoom")}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setShowRoomForm(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
