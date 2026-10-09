import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { usePrinterConnection } from "@/core/presentation/hooks/usePrinterConnection";
import { useDateFormatter } from "@/lib/i18n/formatters";
import { lineDisplayName } from "@/lib/pos/orderListDisplay";
import { useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";
import { SettleSalesOrderResultDTO } from "@/core/application/dtos/SalesOrderDTO";
import {
  findMemberCardPaymentMethod,
  LOCAL_MEMBER_CARD_METHOD_ID,
} from "@/core/application/services/PosPaymentCatalog";
import { PaymentMethod, Product, SalesOrderLine } from "@/core/domain/entities/Cashier";
import { GuestCard, GuestWallet } from "@/core/domain/entities/GuestWallet";
import { SpaRoom, SpaSession } from "@/core/domain/entities/Spa";
import { useCashier } from "@/core/presentation/hooks/useCashier";
import { useGuestWalletManagement } from "@/core/presentation/hooks/useGuestWalletManagement";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useSalesOrderManagement } from "@/core/presentation/hooks/useSalesOrderManagement";
import { RoomKind, useRoomPos } from "@/core/presentation/hooks/useRoomPos";
import { useRoomText } from "@/core/presentation/hooks/useRoomText";
import { useRoomPromotions } from "@/core/presentation/hooks/useRoomPromotions";
import type { RunningPromotion } from "@/core/domain/entities/Promotion";
import { useSpaPackages } from "@/core/presentation/hooks/useSpaPackages";
import { useVenueSetting } from "@/core/presentation/hooks/useVenueSetting";
import {
  changeChoice,
  choiceTotals,
  chosenPackages,
  PackageChoice,
  packageOrders,
} from "@/lib/spa/packages";
import { getKtvWarning } from "@/lib/ktv/session";
import { isUnspendableWalletStatus } from "@/lib/pos/guestWalletAmounts";
import {
  buildSpaSettlePayments,
  cardCanCover,
  estimateCardCharge,
} from "@/lib/spa/payment";
import { freeTimeFor } from "@/lib/spa/freeTime";
import { estimateRoomCharges } from "@/lib/spa/roomCharges";
import type { Hostess } from "@/core/domain/entities/Hostess";
import { usePlaceCharges } from "@/core/presentation/hooks/usePlaceCharges";
import { HostessPicker } from "./spa/HostessPicker";
import {
  addPending,
  changePending,
  focPending,
  paidPending,
  PendingItem,
  pendingOrderItems,
  pendingSaving,
  pendingTotal,
  toggleOneFoc,
} from "@/lib/spa/pending";
import {
  findActiveSpaSession,
  isOpenSpaSession,
  spaSettleKey,
  sessionMinutes,
} from "@/lib/spa/session";
import { ProductMenu } from "./cashier/ProductMenu";
import { CardTapDialog } from "./spa/CardTapDialog";
import { SpaBillPanel } from "./spa/SpaBillPanel";
import { PackagePicker } from "./spa/PackagePicker";
import { SpaRoomTile } from "./spa/SpaRoomTile";
import { modifierPrintText } from "@/lib/printing/modifierText";
import { cashierLabel } from "@/lib/printing/cashier";

type SpaStep = "rooms" | "sessions" | "menu" | "pay";
type CardAction = "add" | "open" | "extend" | "pay";

type ResumeState = { roomId?: string; session?: SpaSession; pending?: PendingItem[] };

const resumeKey = (kind: RoomKind) => `${kind}-pos-resume`;

const readResume = (kind: RoomKind): ResumeState | null => {
  try {
    const raw = window.sessionStorage.getItem(resumeKey(kind));
    return raw ? (JSON.parse(raw) as ResumeState) : null;
  } catch {
    return null;
  }
};
const writeResume = (kind: RoomKind, value: ResumeState | null) => {
  try {
    if (value) window.sessionStorage.setItem(resumeKey(kind), JSON.stringify(value));
    else window.sessionStorage.removeItem(resumeKey(kind));
  } catch {
    // Storage can be blocked; the cashier then re-selects the room after a top-up.
  }
};

const emptyRoomForm = {
  roomNumber: "",
  name: "",
  capacity: "1",
  sessionPrice: "",
  treatmentMinutes: "60",
  graceMinutes: "15",
};

/** The products behind room time and SPA packages, which are not on the menu. */
const ROOM_CATEGORIES = ["Spa Packages", "Spa Rooms", "KTV Rooms"];

const money = (value: string | number | undefined) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function SpaBoardPage({ kind = "spa" }: { kind?: RoomKind }) {
  const { t } = useTranslation();
  const tr = useRoomText(kind);
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
    pauseSession,
    resumeSession,
    closeSession,
    extendSession,
    chargeItems,
    giveFree,
    refundLine,
    clearQuote,
  } = useRoomPos(kind);
  const {
    products,
    variantsByProductId,
    paymentMethods,
    discountReasons,
    fetchDiscountReasons,
    fetchProducts,
    fetchProductVariants,
    fetchPaymentMethods,
    listKdsTickets,
  } = useCashier();
  const {
    orderLines,
    fetchOrderLines,
    addOrderLine,
    updateOrderLine,
    deleteOrderLine,
    settleOrder,
  } = useSalesOrderManagement();
  const { lookupCard, getWallet } = useGuestWalletManagement();
  const { user } = useAuth();
  const { formatDateTime } = useDateFormatter();
  const { activeLocationId, activePosRegisterId, requireCashierContext, isWorkspaceReady } =
    usePosWorkspace();
  const printer = usePrinterConnection(
    String(user?.tenantId || ""),
    activePosRegisterId,
    activeLocationId
  );

  const [step, setStep] = useState<SpaStep>("rooms");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [filter, setFilter] = useState<"ALL" | "AVAILABLE" | "ACTIVE">("ALL");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [session, setSession] = useState<SpaSession | null>(null);
  const [guestCount, setGuestCount] = useState("1");
  const [sessionCount, setSessionCount] = useState(1);
  const [card, setCard] = useState<GuestCard | null>(null);
  const [wallet, setWallet] = useState<GuestWallet | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [cardPrompt, setCardPrompt] = useState<CardAction | null>(null);
  const [cardPromptError, setCardPromptError] = useState<string | null>(null);
  const [isCheckingCard, setIsCheckingCard] = useState(false);
  const [balanceWarning, setBalanceWarning] = useState<GuestWallet | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tip, setTip] = useState("");
  const [splitCash, setSplitCash] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [paid, setPaid] = useState<SettleSalesOrderResultDTO | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [extendCount, setExtendCount] = useState(1);
  const [packageChoice, setPackageChoice] = useState<PackageChoice>({});
  const [extendChoice, setExtendChoice] = useState<PackageChoice>({});
  const [confirmEnd, setConfirmEnd] = useState(false);
  const tapKeys = useRef<Partial<Record<CardAction, string>>>({});
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<SpaRoom | null>(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [showFoc, setShowFoc] = useState(false);
  const [focReason, setFocReason] = useState("");
  const [isGivingFoc, setIsGivingFoc] = useState(false);
  const [rentalVariantId, setRentalVariantId] = useState("");
  const [pickedCharges, setPickedCharges] = useState<string[]>([]);
  const [hostessFor, setHostessFor] = useState<{
    product: Product;
    variantId: string;
    unitPrice: number;
    quantity: number;
  } | null>(null);

  const room = rooms.find((item) => item.id === selectedRoomId) || null;
  const isSpa = kind === "spa";
  const { packages: spaPackages, error: packagesError } = useSpaPackages(isSpa);
  const venue = useVenueSetting();
  // A new room follows Venue setup; a running one keeps how it started.
  const startsAtEnd = venue.paymentTiming === "PAY_AT_END";
  const atEnd = quote?.paymentTiming === "PAY_AT_END";
  // Venue setup can turn food and drinks off for SPA or KTV; the server refuses them then.
  const menuAllowed = isSpa ? venue.spaMenuOrdering : venue.ktvMenuOrdering;
  const openSessions = useMemo(
    () => (room?.sessions || []).filter(isOpenSpaSession),
    [room?.sessions]
  );
  const billClosed = session?.sessionState === "CLOSED";
  const liveSession = room?.sessions.find((item) => item.id === session?.id);
  const cardMethod = findMemberCardPaymentMethod(paymentMethods);
  const cashMethod = paymentMethods.find(
    (method) => String(method.kind || "").toUpperCase() === "CASH"
  );
  // Customer credit needs a named customer, which a room bill does not take here.
  const otherMethods = paymentMethods.filter(
    (method) =>
      method.id !== cardMethod?.id &&
      method.id !== LOCAL_MEMBER_CARD_METHOD_ID &&
      !["GUEST_CARD", "CUSTOMER_CREDIT"].includes(String(method.kind || "").toUpperCase())
  );
  const [otherMethodId, setOtherMethodId] = useState("");
  const tipValue = Math.max(0, Number(tip) || 0);
  const cashValue = splitCash ? Math.max(0, Number(cashAmount) || 0) : 0;
  const estimatedCard = estimateCardCharge({
    runningTotal: quote?.runningTotal || 0,
    discountBps: wallet?.discountBpsSnapshot,
    tip: tipValue,
    cash: cashValue,
  });
  const itemNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const product of products) {
      for (const variant of variantsByProductId[product.id] || []) {
        names[variant.id] = product.name;
      }
    }
    if (room) names[room.rateVariantId] = tr("treatmentCharge");
    for (const item of spaPackages) names[item.variantId] = item.name;
    return names;
  }, [products, room, spaPackages, tr, variantsByProductId]);
  const pendingByProduct = useMemo(
    () =>
      pending.reduce<Record<string, number>>((counts, item) => {
        counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
        return counts;
      }, {}),
    [pending]
  );
  const packageVariantIds = useMemo(
    () => new Set(spaPackages.map((item) => item.variantId)),
    [spaPackages]
  );
  // Before the room starts, the packages it starts with; once it runs, the ones added.
  const booking = session ? extendChoice : packageChoice;
  // KTV: the rentals this room can be sold under; the room's own rate unless another is picked.
  const placeCharges = usePlaceCharges(room ? room.id : null);
  const rentals = isSpa ? [] : placeCharges;
  const rental =
    rentals.find((item) => item.variantId === rentalVariantId) ||
    rentals.find((item) => item.variantId === room?.rateVariantId) ||
    rentals[0] ||
    null;
  // The room's own rate is quoted at the price now (peak hours included).
  const roomSessionPrice =
    rental && rental.variantId !== room?.rateVariantId ? rental.unitPrice : room?.sessionPrice;
  const unitMinutes = !isSpa && rental ? rental.blockMinutes : sessionMinutes(room);
  const minimumUnits = !isSpa && rental ? rental.minimumUnits : 1;
  const hoursBought = session ? extendCount : sessionCount;
  // Packages a running "buy X, get Y free" adds on top, with their time.
  const freePackagesFor = (running: RunningPromotion[]) =>
    chosenPackages(booking, spaPackages).flatMap(({ package: item, quantity }) => {
      const free = freeTimeFor(item.variantId, quantity, running, "SPA_PACKAGE");
      return free ? [{ package: item, free }] : [];
    });
  // SPA: the room's own charges, e.g. a VIP room fee or a sauna by the hour.
  const roomChargesFor = (running: RunningPromotion[]) =>
    isSpa
      ? estimateRoomCharges(
          placeCharges,
          pickedCharges,
          {
            minutes:
              choiceTotals(packageChoice, spaPackages).minutes +
              (session
                ? 0
                : freePackagesFor(running).reduce(
                    (sum, { package: item, free }) => sum + item.durationMinutes * free.units,
                    0
                  )),
            billAtEnd: startsAtEnd,
          },
          (charge, units) => freeTimeFor(charge.variantId, units, running, "ROOM_TIME", "WITHIN")
        )
      : null;
  const promotions = useRoomPromotions(
    kind,
    activeLocationId || undefined,
    (running) => [
      ...paidPending(pending).map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      ...chosenPackages(booking, spaPackages).map(({ package: item, quantity }) => ({
        variantId: item.variantId,
        quantity,
      })),
      ...(rental && roomSessionPrice !== undefined
        ? [{ variantId: rental.variantId, quantity: hoursBought, unitPrice: roomSessionPrice }]
        : []),
      ...(session
        ? []
        : (roomChargesFor(running)?.now ?? [])
            .filter((line) => line.units - (line.free?.units || 0) > 0)
            .map((line) => ({
              variantId: line.charge.variantId,
              quantity: line.units - (line.free?.units || 0),
              unitPrice: line.charge.unitPrice,
            }))),
    ],
    session?.salesOrderId || undefined
  );
  const saving = (variantId: string | undefined) =>
    (variantId && promotions.discounts[variantId]?.discount) || 0;
  const bookingTotals = choiceTotals(booking, spaPackages);
  const freePackages = freePackagesFor(promotions.running);
  const bookingDue =
    bookingTotals.price -
    chosenPackages(booking, spaPackages).reduce((sum, { package: item }) => sum + saving(item.variantId), 0);
  const pendingDue = pendingTotal(pending) - pendingSaving(pending, promotions.discounts);
  const roomCharges = roomChargesFor(promotions.running);
  const roomChargesSaving = (roomCharges?.now ?? []).reduce(
    (sum, line) => sum + saving(line.charge.variantId),
    0
  );
  const roomChargesDue = (roomCharges?.total || 0) - roomChargesSaving;
  const hoursSaving = saving(rental?.variantId);
  const optionalCharges = isSpa ? placeCharges.filter((charge) => !charge.autoApply) : [];
  // While a treatment runs, the room's charges that can be added later: not clocks,
  // which start with the treatment.
  const laterCharges = optionalCharges.filter(
    (charge) => !(charge.soldBy === "TIME" && charge.chargeMode === "CLOCK")
  );
  const roomChargeChips =
    isSpa && session && !billClosed && laterCharges.length ? (
      <div className="flex flex-wrap items-center gap-2 rounded border border-slate-700 bg-slate-950 p-2 text-sm">
        <span className="font-semibold text-slate-300">{tr("roomCharges")}</span>
        {laterCharges.map((charge) => (
          <button
            key={charge.variantId}
            type="button"
            onClick={() =>
              setPending((current) =>
                addPending(
                  current,
                  {
                    variantId: charge.variantId,
                    productId: charge.productId,
                    name: charge.name,
                    unitPrice: charge.unitPrice,
                  },
                  charge.soldBy === "TIME" ? charge.minimumUnits : 1
                )
              )
            }
            className="rounded border border-slate-600 px-2 py-1 hover:border-emerald-500"
          >
            + {charge.name} · {money(charge.unitPrice)}
            {charge.soldBy === "TIME" ? ` / ${tr("roomChargeBlock", { minutes: charge.blockMinutes })}` : ""}
          </button>
        ))}
      </div>
    ) : null;
  const freeTime = !isSpa && rental ? freeTimeFor(rental.variantId, sessionCount, promotions.running) : null;
  const extendFreeTime =
    !isSpa && rental ? freeTimeFor(rental.variantId, extendCount, promotions.running) : null;
  const rateProductIds = useMemo(
    () => new Set(rooms.map((item) => item.rateProductId).filter(Boolean)),
    [rooms]
  );
  // Room time and packages are booked with the room, never ordered from the menu. A
  // product sold only at other areas stays off, and only KTV can pick a hostess.
  const area = isSpa ? "SPA" : "KTV";
  const menuProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.kind !== "RENTAL" &&
          !rateProductIds.has(product.id) &&
          !ROOM_CATEGORIES.includes(product.categoryName || "") &&
          (!product.soldAt?.length || product.soldAt.includes(area)) &&
          (!isSpa || !product.askWhoServed)
      ),
    [area, isSpa, products, rateProductIds]
  );
  const startCharge = (roomSessionPrice || 0) * sessionCount - (session ? 0 : hoursSaving);
  const extendCharge = (roomSessionPrice || 0) * extendCount - (session ? hoursSaving : 0);
  const freePackageNotes = freePackages.length ? (
    <div className="space-y-1">
      {freePackages.map(({ package: item, free }) => (
        <p
          key={item.id}
          className="rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-1 text-sm text-emerald-200"
        >
          {tr("freePackageAdded", { count: free.units, package: item.name, name: free.name })}
        </p>
      ))}
    </div>
  ) : null;
  const visibleRooms = useMemo(
    () =>
      rooms.filter((item) => {
        const active = Boolean(findActiveSpaSession(item));
        if (filter === "ACTIVE") return active;
        if (filter === "AVAILABLE") return !active && item.status === "AVAILABLE";
        return true;
      }),
    [filter, rooms]
  );

  const loadBill = useCallback(
    async (target: SpaSession) => {
      await Promise.all([
        getQuote(target.id),
        target.salesOrderId
          ? fetchOrderLines(target.salesOrderId, { page: 1, limit: 200 })
          : Promise.resolve(),
      ]);
    },
    [fetchOrderLines, getQuote]
  );

  const acceptCard = useCallback(
    async (uid: string) => {
      const foundCard = await lookupCard(uid.trim());
      const foundWallet = foundCard.wallet || (await getWallet(foundCard.walletId));
      if (isUnspendableWalletStatus(foundWallet.status)) {
        throw new Error(tr("errors.walletUnavailable"));
      }
      setCard(foundCard);
      setWallet(foundWallet);
      return { foundCard, foundWallet };
    },
    [getWallet, lookupCard, tr]
  );

  useEffect(() => {
    if (!notice) return;
    toast.success(notice);
    setNotice(null);
  }, [notice]);

  useEffect(() => {
    if (!actionError) return;
    toast.error(actionError);
    setActionError(null);
  }, [actionError]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (packagesError) toast.error(tr("errors.packages", { message: packagesError }));
  }, [packagesError, tr]);

  useEffect(() => {
    void fetchBoard();
    void fetchProducts({ page: 1, limit: 100 });
    void fetchPaymentMethods();
  }, [fetchBoard, fetchPaymentMethods, fetchProducts]);

  useEffect(() => {
    const returned = location.state as { cardNumber?: string } | null;
    if (!returned?.cardNumber) return;
    const resume = readResume(kind);
    void acceptCard(returned.cardNumber)
      .then(async () => {
        if (resume?.session) {
          setSelectedRoomId(resume.roomId || resume.session.roomId || "");
          setSession(resume.session);
          setPending(resume.pending || []);
          await loadBill(resume.session);
          setStep(resume.session.sessionState === "CLOSED" ? "pay" : "menu");
        }
        setNotice(tr("cardAccepted"));
      })
      .catch(() => setActionError(tr("errors.cardLookup")));
  }, [acceptCard, kind, loadBill, location.state, tr]);

  useEffect(() => {
    if (!session || billClosed || (step !== "menu" && step !== "pay")) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void getQuote(session.id);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [billClosed, getQuote, session, step]);

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

  const refreshBill = async (target: SpaSession) => {
    if (target.salesOrderId) {
      await fetchOrderLines(target.salesOrderId, { page: 1, limit: 200 });
    }
    return getQuote(target.id);
  };

  const forgetCard = () => {
    setCard(null);
    setWallet(null);
  };

  const backToBoard = () => {
    setSession(null);
    clearQuote();
    setSelectedRoomId("");
    forgetCard();
    setPending([]);
    setPaid(null);
    setNotice(null);
    setActionError(null);
    setStep("rooms");
  };

  const openTopup = () => {
    if (!card || !wallet) return;
    writeResume(kind, session ? { roomId: selectedRoomId, session, pending } : null);
    navigate("/cards", {
      state: {
        cardNumber: card.cardUid,
        balance: wallet.balance,
        customerName: wallet.guestName,
        customerPhone: wallet.guestPhone,
        tenantId: wallet.tenantId,
        walletId: wallet.id,
        returnTo: kind === "ktv" ? "/ktv" : "/spa",
      },
    });
  };

  const selectSession = async (next: SpaSession) => {
    if (next.guestWalletId && wallet && next.guestWalletId !== wallet.id) {
      forgetCard();
    }
    setActionError(null);
    setSession(next);
    setPending([]);
    setPaid(null);
    setTip("");
    setCashAmount("");
    setSplitCash(false);
    await loadBill(next);
    setStep("menu");
  };

  const selectRoom = (next: SpaRoom) => {
    setSelectedRoomId(next.id);
    setRentalVariantId("");
    setPickedCharges([]);
    setSession(null);
    clearQuote();
    setGuestCount("1");
    setSessionCount(1);
    setPackageChoice({});
    const running = next.sessions.filter(isOpenSpaSession);
    if (running.length === 1) {
      void selectSession(running[0]);
      return;
    }
    setStep("sessions");
  };

  const keyFor = (action: CardAction) => {
    if (!tapKeys.current[action]) {
      tapKeys.current[action] =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    return tapKeys.current[action]!;
  };

  const chargeFrom = async (action: CardAction, payerCard: GuestCard | null, method?: PaymentMethod) => {
    if (method) {
      const context = await requireCashierContext();
      return {
        context,
        charge: {
          paymentMethodId: method.id,
          posSessionId: context.posSessionId,
          idempotencyKey: keyFor(action),
        },
      };
    }
    if (!payerCard || !cardMethod || cardMethod.id === LOCAL_MEMBER_CARD_METHOD_ID) {
      throw new Error(tr("errors.paymentUnavailable"));
    }
    const context = await requireCashierContext();
    return {
      context,
      charge: {
        guestCardId: payerCard.id,
        paymentMethodId: cardMethod.id,
        posSessionId: context.posSessionId,
        idempotencyKey: keyFor(action),
      },
    };
  };

  const showCharged = (
    payer: GuestWallet | null,
    charged: string,
    balanceAfter: string,
    method?: PaymentMethod
  ) => {
    if (!payer) {
      setNotice(tr("paidWith", { amount: money(charged), method: method?.name || "" }));
      return;
    }
    setWallet({ ...payer, balance: balanceAfter });
    setNotice(
      tr("charged", { amount: money(charged), balance: money(balanceAfter) })
    );
  };

  /** The kitchen tickets an order has so far, or null when they cannot be read. */
  const kitchenTicketIds = async (salesOrderId?: string | null) => {
    if (!salesOrderId) return new Set<string>();
    try {
      const { tickets } = await listKdsTickets({ salesOrderId, limit: 100 });
      return new Set(tickets.map((ticket) => ticket.id));
    } catch {
      return null;
    }
  };

  /** Prints the kitchen tickets an order got since `before`. */
  const printNewTickets = async (
    salesOrderId: string | null | undefined,
    before: Set<string> | null
  ) => {
    if (!salesOrderId || !before) return;
    try {
      const { tickets } = await listKdsTickets({ salesOrderId, limit: 100 });
      for (const ticket of tickets.filter((item) => !before.has(item.id))) {
        await printer.printTicket(ticket);
      }
    } catch (caught) {
      setActionError(
        t("kds.printFailed", {
          error: caught instanceof Error ? caught.message : t("roomOrders.printFailed"),
        })
      );
    }
  };

  const openTreatment = async (
    payer: GuestWallet | null,
    payerCard: GuestCard | null,
    method?: PaymentMethod
  ) => {
    if (!room) return;
    setActionError(null);
    try {
      const { context, charge } = await chargeFrom("open", payerCard, method);
      const created = await openSession({
        roomId: room.id,
        ...(payer ? { guestWalletId: payer.id } : {}),
        guestCount: Math.max(1, Number(guestCount) || 1),
        ...(isSpa
          ? {
              packages: packageOrders(packageChoice, spaPackages),
              roomCharges: pickedCharges.map((variantId) => ({ variantId })),
            }
          : { sessions: sessionCount, rentalVariantId: rental?.variantId }),
        prepay: charge,
        posRegisterId: context.posRegisterId,
        openedByPosSessionId: context.posSessionId,
        salesChannel: "POS",
      });
      tapKeys.current.open = undefined;
      void printNewTickets(created.salesOrderId, new Set());
      await fetchBoard();
      await selectSession(created);
      if (payer) setWallet(await getWallet(payer.id));
      setNotice(tr("treatmentStarted"));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.openSession"));
    }
  };

  /** Pay at the end: the room starts with what was booked on its bill, no card tap. */
  const openOnBill = async () => {
    if (!room) return;
    setActionError(null);
    try {
      const context = await requireCashierContext();
      const created = await openSession({
        roomId: room.id,
        ...(wallet ? { guestWalletId: wallet.id } : {}),
        guestCount: Math.max(1, Number(guestCount) || 1),
        ...(isSpa
          ? {
              packages: packageOrders(packageChoice, spaPackages),
              roomCharges: pickedCharges.map((variantId) => ({ variantId })),
            }
          : { sessions: sessionCount, rentalVariantId: rental?.variantId }),
        posRegisterId: context.posRegisterId,
        openedByPosSessionId: context.posSessionId,
        salesChannel: "POS",
      });
      void printNewTickets(created.salesOrderId, new Set());
      await fetchBoard();
      await selectSession(created);
      setNotice(tr("startedOnBill"));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.openSession"));
    }
  };

  /** Pay at the end: more time goes on the bill, no card tap. */
  const extendOnBill = async () => {
    if (!session) return;
    setActionError(null);
    setIsAdding(true);
    try {
      const before = await kitchenTicketIds(session.salesOrderId);
      await extendSession(
        session.id,
        isSpa
          ? { packages: packageOrders(extendChoice, spaPackages), idempotencyKey: keyFor("extend") }
          : { sessions: extendCount, idempotencyKey: keyFor("extend") }
      );
      tapKeys.current.extend = undefined;
      void printNewTickets(session.salesOrderId, before);
      setShowExtend(false);
      setSession({
        ...session,
        plannedMinutes:
          (session.plannedMinutes || 0) +
          (isSpa
            ? choiceTotals(extendChoice, spaPackages).minutes
            : (extendCount + (extendFreeTime?.units || 0)) * unitMinutes),
      });
      setExtendChoice({});
      setNotice(tr("addedToBillNotice"));
      await fetchBoard();
      await refreshBill(session);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.extend"));
    } finally {
      setIsAdding(false);
    }
  };

  /** Pay at the end: new items go on the bill and to the kitchen, no card tap. */
  const commitOnBill = async () => {
    const toAdd = paidPending(pending);
    if (!session || billClosed || !toAdd.length) return;
    setActionError(null);
    setIsAdding(true);
    try {
      const before = await kitchenTicketIds(session.salesOrderId);
      await chargeItems(session.id, {
        items: pendingOrderItems(toAdd),
        idempotencyKey: keyFor("add"),
      });
      tapKeys.current.add = undefined;
      void printNewTickets(session.salesOrderId, before);
      setPending(focPending);
      setNotice(tr("itemsAdded", { count: toAdd.reduce((sum, item) => sum + item.quantity, 0) }));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.editLine"));
    } finally {
      setIsAdding(false);
      await refreshBill(session);
    }
  };

  /** Adds the tray: a card tap when paying as it goes, straight onto the bill otherwise. */
  const addPaidItems = () => {
    if (atEnd) void commitOnBill();
    else requestCard("add");
  };

  const extendTreatment = async (
    payer: GuestWallet | null,
    payerCard: GuestCard | null,
    method?: PaymentMethod
  ) => {
    if (!session) return;
    setActionError(null);
    setIsAdding(true);
    try {
      const { charge } = await chargeFrom("extend", payerCard, method);
      const before = await kitchenTicketIds(session.salesOrderId);
      const result = await extendSession(
        session.id,
        isSpa
          ? { ...charge, packages: packageOrders(extendChoice, spaPackages) }
          : { ...charge, sessions: extendCount }
      );
      tapKeys.current.extend = undefined;
      void printNewTickets(session.salesOrderId, before);
      setShowExtend(false);
      setSession({
        ...session,
        plannedMinutes:
          (session.plannedMinutes || 0) +
          (isSpa
            ? choiceTotals(extendChoice, spaPackages).minutes
            : (extendCount + (extendFreeTime?.units || 0)) * unitMinutes),
      });
      setExtendChoice({});
      showCharged(payer, result.charged, result.balanceAfter, method);
      await fetchBoard();
      await refreshBill(session);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.extend"));
    } finally {
      setIsAdding(false);
    }
  };

  const commitPending = async (
    payer: GuestWallet | null,
    payerCard: GuestCard | null,
    force = false,
    method?: PaymentMethod
  ) => {
    const toPay = paidPending(pending);
    if (!session?.salesOrderId || billClosed || !toPay.length) return;
    const prepaid = Boolean(quote?.prepaid);
    const estimate = estimateCardCharge({
      runningTotal: (prepaid ? 0 : Number(quote?.runningTotal || 0)) + pendingDue,
      discountBps: payer?.discountBpsSnapshot,
    });
    if (payer && !force && !cardCanCover(payer, estimate)) {
      setBalanceWarning(payer);
      return;
    }
    setBalanceWarning(null);
    setActionError(null);
    setIsAdding(true);
    if (prepaid) {
      try {
        const { charge } = await chargeFrom("add", payerCard, method);
        const before = await kitchenTicketIds(session.salesOrderId);
        const result = await chargeItems(session.id, {
          ...charge,
          items: pendingOrderItems(toPay),
        });
        tapKeys.current.add = undefined;
        void printNewTickets(session.salesOrderId, before);
        setPending(focPending);
        showCharged(payer, result.charged, result.balanceAfter, method);
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : tr("errors.editLine"));
      } finally {
        setIsAdding(false);
        await refreshBill(session);
      }
      return;
    }
    let remaining = pending;
    let added = 0;
    try {
      for (const item of toPay) {
        await addOrderLine(session.salesOrderId, {
          variantId: item.variantId,
          quantity: item.quantity.toFixed(4),
          unitPrice: item.unitPrice.toFixed(4),
          lineDiscount: "0.0000",
        });
        remaining = remaining.filter((entry) => entry !== item);
        added += item.quantity;
      }
      setNotice(tr("itemsAdded", { count: added }));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.editLine"));
    } finally {
      setPending(remaining);
      setIsAdding(false);
      await refreshBill(session);
    }
  };

  const addPendingToBill = () => {
    setActionError(null);
    if (focPending(pending).length) {
      setShowFoc(true);
      void fetchDiscountReasons().catch(() => undefined);
      return;
    }
    addPaidItems();
  };

  const confirmFoc = async () => {
    const free = focPending(pending);
    if (!session || !free.length || !focReason.trim()) return;
    setActionError(null);
    setIsGivingFoc(true);
    try {
      const before = await kitchenTicketIds(session.salesOrderId);
      await giveFree(session.id, {
        items: pendingOrderItems(free),
        reason: focReason.trim(),
      });
      void printNewTickets(session.salesOrderId, before);
      const count = free.reduce((sum, item) => sum + item.quantity, 0);
      const rest = paidPending(pending);
      setPending(rest);
      setShowFoc(false);
      setNotice(tr("focGiven", { count }));
      await refreshBill(session);
      if (rest.length) addPaidItems();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.foc"));
    } finally {
      setIsGivingFoc(false);
    }
  };

  const runCardAction = (action: CardAction, payer: GuestWallet, payerCard: GuestCard) => {
    if (action === "add") void commitPending(payer, payerCard);
    else if (action === "open") void openTreatment(payer, payerCard);
    else if (action === "extend") void extendTreatment(payer, payerCard);
    else setStep("pay");
  };

  /** Pays the prompt's order another way than the card: cash, a transfer, and so on. */
  const payWith = (methodId: string) => {
    const method = otherMethods.find((item) => item.id === methodId);
    const action = cardPrompt;
    if (!method || !action) return;
    setCardPrompt(null);
    if (action === "add") void commitPending(null, null, false, method);
    else if (action === "open") void openTreatment(null, null, method);
    else if (action === "extend") void extendTreatment(null, null, method);
  };

  const requestCard = (action: CardAction) => {
    setCardPromptError(null);
    setCardPrompt(action);
  };

  const handleCardRead = async (uid: string) => {
    if (!cardPrompt || isCheckingCard) return;
    setCardPromptError(null);
    setIsCheckingCard(true);
    try {
      const { foundCard, foundWallet } = await acceptCard(uid);
      if (
        cardPrompt !== "open" &&
        session?.guestWalletId &&
        session.guestWalletId !== foundWallet.id
      ) {
        forgetCard();
        setCardPromptError(tr("errors.wrongSessionCard"));
        return;
      }
      const action = cardPrompt;
      setCardPrompt(null);
      runCardAction(action, foundWallet, foundCard);
    } catch (caught) {
      forgetCard();
      setCardPromptError(
        caught instanceof Error ? caught.message : tr("errors.cardLookup")
      );
    } finally {
      setIsCheckingCard(false);
    }
  };

  const endTreatment = async () => {
    if (!session) return;
    if (pending.length) {
      setActionError(tr("errors.pendingItems"));
      return;
    }
    setActionError(null);
    setIsPaying(true);
    try {
      const final = await closeSession(session.id, {});
      writeResume(kind, null);
      await fetchBoard();
      try {
        await printer.printReceipt({
          title: "RECEIPT",
          place: "CHECKOUT",
          showLogo: true,
          showPrices: true,
          receiptId: final.orderNumber || quote?.orderNumber || undefined,
          cashier: cashierLabel(final.cashier, user),
          serviceType: kind === "ktv" ? "KTV" : "SPA",
          tableOrRoom: final.roomNumber || room?.roomNumber,
          paidAt: new Date().toLocaleString(),
          startTime: formatDateTime(session.openedAt),
          endTime: formatDateTime(final.asOf || new Date().toISOString()),
          startTimeLabel: t("receipt.startTime"),
          endTimeLabel: t("receipt.endTime"),
          lines: orderLines
            .filter((line) => !line.voidedAt)
            .map((line) => {
              const modifiers = modifierPrintText(line.selectedModifiers);
              return {
                name: lineDisplayName(line) || line.productName || itemNames[line.variantId] || tr("item"),
                quantity: String(line.quantity || "1"),
                unitPrice: line.unitPrice?.trim() || undefined,
                modifiers: modifiers.names,
                modifierPrices: modifiers.prices,
              };
            }),
          total: String(final.paidTotal || final.runningTotal || "0"),
        });
      } catch (printError) {
        toast.error(
          printError instanceof Error ? printError.message : t("receipt.printFailed")
        );
      }
      backToBoard();
      setNotice(
        tr("treatmentEnded", {
          room: final.roomNumber || room?.roomNumber || "",
          amount: money(final.paidTotal),
        })
      );
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.pay"));
    } finally {
      setIsPaying(false);
      setConfirmEnd(false);
    }
  };

  const handleOpenSession = (event: FormEvent) => {
    event.preventDefault();
    if (!room) return;
    if (isSpa && !choiceTotals(packageChoice, spaPackages).count) return;
    if (startsAtEnd) void openOnBill();
    else requestCard("open");
  };

  const handleAddProduct = async (product: Product, variantId: string, quantity: number) => {
    if (!session || billClosed) throw new Error(tr("errors.sessionRequired"));
    const variants = variantsByProductId[product.id]?.length
      ? variantsByProductId[product.id]
      : await fetchProductVariants(product.id);
    const variant = variants.find((item) => item.id === variantId) || variants[0];
    if (!variant) throw new Error(t("cashier.productMenu.noVariant"));
    setNotice(null);
    const unitPrice = Number(product.basePrice || 0) + Number(variant.priceModifier || 0);
    if (!isSpa && product.askWhoServed) {
      setHostessFor({ product, variantId: variant.id, unitPrice, quantity: Math.max(1, quantity) });
      return;
    }
    setPending((current) =>
      addPending(
        current,
        {
          variantId: variant.id,
          productId: product.id,
          name: product.name,
          unitPrice: Number(product.basePrice || 0) + Number(variant.priceModifier || 0),
        },
        Math.max(1, quantity)
      )
    );
  };

  const pickHostess = (hostess: Hostess) => {
    if (!hostessFor) return;
    const { product, variantId, unitPrice, quantity } = hostessFor;
    const who = hostess.nickname || hostess.name;
    setPending((current) =>
      addPending(
        current,
        {
          variantId,
          productId: product.id,
          name: `${product.name} · ${who}`,
          unitPrice,
          hostessId: hostess.id,
          hostessName: who,
        },
        quantity
      )
    );
    setHostessFor(null);
  };

  const addAnother = (line: SalesOrderLine) => {
    const product = products.find((item) =>
      (variantsByProductId[item.id] || []).some((variant) => variant.id === line.variantId)
    );
    if (!isSpa && product?.askWhoServed) {
      setHostessFor({
        product,
        variantId: line.variantId,
        unitPrice: Number(line.unitPrice || 0),
        quantity: 1,
      });
      return;
    }
    setPending((current) =>
      addPending(current, {
        variantId: line.variantId,
        productId: product?.id || line.variantId,
        name: line.productName || itemNames[line.variantId] || tr("item"),
        unitPrice: Number(line.unitPrice || 0),
      })
    );
  };

  const reduceLine = async (line: SalesOrderLine) => {
    if (!session?.salesOrderId || billClosed) return;
    const next = Number(line.quantity || 0) - 1;
    setActionError(null);
    try {
      if (next <= 0) await deleteOrderLine(session.salesOrderId, line.id);
      else await updateOrderLine(session.salesOrderId, line.id, { quantity: next.toFixed(4) });
      await refreshBill(session);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.editLine"));
    }
  };

  const removeLine = async (line: SalesOrderLine) => {
    if (!session?.salesOrderId || billClosed) return;
    setActionError(null);
    if (quote?.prepaid && line.compReasonId) {
      try {
        await refundLine(session.id, line.id);
        await refreshBill(session);
        setNotice(tr("lineRemoved"));
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : tr("errors.editLine"));
      }
      return;
    }
    if (quote?.prepaid) {
      try {
        const result = await refundLine(session.id, line.id);
        await refreshBill(session);
        if (wallet) setWallet({ ...wallet, balance: result.balanceAfter });
        setNotice(
          tr("refunded", {
            amount: money(Math.abs(Number(result.charged))),
            balance: money(result.balanceAfter),
          })
        );
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : tr("errors.editLine"));
      }
      return;
    }
    try {
      await deleteOrderLine(session.salesOrderId, line.id);
      await refreshBill(session);
      setNotice(tr("lineRemoved"));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.editLine"));
    }
  };

  const togglePause = async () => {
    if (!session || billClosed) return;
    const updated =
      session.sessionState === "PAUSED"
        ? await resumeSession(session.id)
        : await pauseSession(session.id);
    setSession({ ...session, ...updated, salesOrderId: session.salesOrderId });
    await getQuote(session.id);
  };

  const printPaid = async (
    result: SettleSalesOrderResultDTO,
    endAt: string,
    methodName: string
  ) => {
    if (!session) return;
    try {
      await printer.printReceipt({
        title: "RECEIPT",
        place: "CHECKOUT",
        showLogo: true,
        showPrices: true,
        receiptId: result.orderNumber || quote?.orderNumber || undefined,
        cashier: cashierLabel(user),
        serviceType: kind === "ktv" ? "KTV" : "SPA",
        tableOrRoom: room?.roomNumber || quote?.roomNumber,
        paidAt: new Date().toLocaleString(),
        startTime: formatDateTime(session.openedAt),
        endTime: formatDateTime(endAt),
        startTimeLabel: t("receipt.startTime"),
        endTimeLabel: t("receipt.endTime"),
        lines: orderLines
          .filter((line) => !line.voidedAt)
          .map((line) => {
            const modifiers = modifierPrintText(line.selectedModifiers);
            return {
              name: lineDisplayName(line) || line.productName || itemNames[line.variantId] || tr("item"),
              quantity: String(line.quantity || "1"),
              unitPrice: line.unitPrice?.trim() || undefined,
              modifiers: modifiers.names,
              modifierPrices: modifiers.prices,
            };
          }),
        total: result.grandTotal,
        payments: [{ name: methodName, amount: result.totalPaid || result.grandTotal }],
      });
    } catch (printError) {
      toast.error(
        printError instanceof Error ? printError.message : t("receipt.printFailed")
      );
    }
  };

  /** Pay at the end with cash or another method: close the room, then settle the bill. */
  const handlePayOther = async () => {
    const method = otherMethods.find((item) => item.id === otherMethodId);
    if (!session?.salesOrderId || !method) return;
    setActionError(null);
    setIsPaying(true);
    try {
      const context = await requireCashierContext();
      let endAt = session.closedAt || session.endsAt || "";
      let due = Number(quote?.amountDue || 0);
      if (!billClosed) {
        const closed = await closeSession(session.id, {});
        endAt = closed.asOf || new Date().toISOString();
        due = Number(closed.amountDue ?? closed.runningTotal ?? 0);
        setSession({ ...session, sessionState: "CLOSED" });
      }
      const result =
        due > 0
          ? await settleOrder(session.salesOrderId, {
              payments: [{ paymentMethodId: method.id, amount: (due + tipValue).toFixed(4) }],
              posSessionId: context.posSessionId,
              ...(tipValue > 0 ? { tipAmount: tipValue.toFixed(4) } : {}),
              idempotencyKey: spaSettleKey(session.id),
            })
          : {
              orderId: session.salesOrderId,
              orderNumber: "",
              grandTotal: "0.0000",
              totalPaid: "0.0000",
              change: "0.0000",
              status: "COMPLETED",
            };
      await printPaid(result, endAt, method.name || "Payment");
      setPaid(result);
      writeResume(kind, null);
      await fetchBoard();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.pay"));
    } finally {
      setIsPaying(false);
    }
  };

  const handlePay = async () => {
    if (!session?.salesOrderId || !card || !wallet) {
      requestCard("pay");
      return;
    }
    if (!cardMethod || cardMethod.id === LOCAL_MEMBER_CARD_METHOD_ID) {
      setActionError(tr("errors.paymentUnavailable"));
      return;
    }
    if (cashValue > 0 && !cashMethod) {
      setActionError(tr("errors.cashUnavailable"));
      return;
    }
    setActionError(null);
    setIsPaying(true);
    try {
      const context = await requireCashierContext();
      let endAt = session.closedAt || session.endsAt || "";
      if (!billClosed) {
        const latest = await getQuote(session.id);
        const estimate = estimateCardCharge({
          runningTotal: latest.runningTotal,
          discountBps: wallet.discountBpsSnapshot,
          tip: tipValue,
          cash: cashValue,
        });
        if (!cardCanCover(wallet, estimate)) {
          setActionError(tr("errors.balanceShort"));
          return;
        }
        const closed = await closeSession(session.id, {});
        endAt = closed.asOf || new Date().toISOString();
        setSession({ ...session, sessionState: "CLOSED" });
      }
      const result = await settleOrder(session.salesOrderId, {
        payments: buildSpaSettlePayments({
          cardMethodId: cardMethod.id,
          guestCardId: card.id,
          cashMethodId: cashMethod?.id,
          cashAmount: cashValue,
        }),
        posSessionId: context.posSessionId,
        ...(tipValue > 0 ? { tipAmount: tipValue.toFixed(4) } : {}),
        idempotencyKey: spaSettleKey(session.id),
      });
      await printPaid(result, endAt, cardMethod.name || "Payment");
      setPaid(result);
      writeResume(kind, null);
      setWallet(await getWallet(wallet.id));
      await fetchBoard();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.pay"));
    } finally {
      setIsPaying(false);
    }
  };

  const goToPay = () => {
    if (pending.length) {
      setActionError(tr("errors.pendingItems"));
      return;
    }
    // When other methods are allowed, the cashier chooses on the pay screen first.
    if (atEnd && otherMethods.length > 0) setStep("pay");
    else requestCard("pay");
  };

  const handleSaveRoom = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeLocationId) return;
    setActionError(null);
    const minutes = Number(roomForm.treatmentMinutes);
    // A SPA room is only where a treatment happens; its time and price come from
    // the service package sold.
    const terms = isSpa
      ? {
          roomNumber: roomForm.roomNumber.trim(),
          name: roomForm.name.trim(),
          capacity: Number(roomForm.capacity),
        }
      : {
          roomNumber: roomForm.roomNumber.trim(),
          name: roomForm.name.trim(),
          capacity: Number(roomForm.capacity),
          sessionPrice: Number(roomForm.sessionPrice),
          minimumMinutes: minutes,
          incrementMinutes: minutes,
          graceMinutes: Number(roomForm.graceMinutes),
          roundingMode: "DOWN" as const,
        };
    try {
      if (editingRoom) await updateRoom(editingRoom.id, terms);
      else await createRoom({ ...terms, locationId: activeLocationId });
      setRoomForm(emptyRoomForm);
      setEditingRoom(null);
      setShowRoomForm(false);
      await fetchBoard();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : tr("errors.saveRoom"));
    }
  };

  const openRoomManager = (managed: SpaRoom) => {
    setEditingRoom(managed);
    setRoomForm({
      roomNumber: managed.roomNumber,
      name: managed.name,
      capacity: String(managed.capacity),
      sessionPrice: managed.sessionPrice == null ? "" : String(managed.sessionPrice),
      treatmentMinutes: String(managed.minimumMinutes),
      graceMinutes: String(managed.graceMinutes),
    });
    setShowRoomForm(true);
  };

  const goBack = () => {
    setActionError(null);
    if (step === "pay") setStep(billClosed ? "pay" : "menu");
    else backToBoard();
  };

  const cardPromptTitle =
    cardPrompt === "add"
      ? tr("confirmAddTitle")
      : cardPrompt === "open"
        ? tr("confirmStartTitle", { room: room?.roomNumber || "" })
        : cardPrompt === "extend"
          ? tr("confirmExtendTitle", { count: isSpa ? bookingTotals.count : extendCount })
          : tr("confirmPayTitle");

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#080808] p-4 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h1 className="text-xl font-bold">{tr("boardTitle")}</h1>
          <p className="text-sm text-slate-400">{tr(`steps.${step}`)}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {step !== "rooms" && !(step === "pay" && billClosed) && !paid ? (
            <Button variant="secondary" onClick={goBack}>
              {step === "pay" ? t("cardTopup.back") : tr("backToBoard")}
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
            {tr("addRoom")}
          </Button>
        </div>
      </header>


      {step === "rooms" ? (
        <>
          <div className="my-3 flex gap-2">
            {(["ALL", "AVAILABLE", "ACTIVE"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  filter === value
                    ? "bg-slate-100 text-slate-900"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                onClick={() => setFilter(value)}
              >
                {tr(`filters.${value.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleRooms.length === 0 ? (
              <p className="mt-10 text-center text-slate-400">{tr("noRooms")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {visibleRooms.map((item) => (
                  <SpaRoomTile
                    kind={kind}
                    key={item.id}
                    room={item}
                    nowMs={nowMs}
                    onSelect={() => selectRoom(item)}
                    onReady={() => void markRoomReady(item.id)}
                    onManage={() => openRoomManager(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {step === "sessions" && room ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {openSessions.map((item) => {
            const warning = getKtvWarning(item.endsAt, nowMs);
            return (
              <button
                key={item.id}
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-left"
                onClick={() => void selectSession(item)}
              >
                <p className="text-lg font-bold">{room.roomNumber}</p>
                <p className="text-sm text-slate-300">
                  {tr("sessionOption", {
                    time: new Date(item.openedAt).toLocaleTimeString(),
                    count: item.guestCount,
                  })}
                </p>
                <p className="mt-2 text-sm">
                  {warning.level === "EXPIRED"
                    ? tr("timeUp")
                    : item.endsAt
                      ? tr("minutesRemaining", { count: warning.remainingMinutes })
                      : tr(`status.${item.sessionState.toLowerCase()}`)}
                </p>
              </button>
            );
          })}
          {openSessions.length === 0 && room.status === "AVAILABLE" ? (
            <form
              className="space-y-3 rounded-lg border border-slate-600 bg-slate-900 p-4"
              onSubmit={handleOpenSession}
            >
              <p className="font-bold">{tr("newSession", { room: room.roomNumber })}</p>
              {isSpa ? (
                <>
                  <PackagePicker
                    kind={kind}
                    packages={spaPackages}
                    choice={packageChoice}
                    discounts={promotions.discounts}
                    onChange={(id, delta) => setPackageChoice((current) => changeChoice(current, id, delta))}
                  />
                  {bookingTotals.count ? (
                    <p className="text-sm text-slate-300">
                      {tr("packagesSummary", {
                        count: bookingTotals.count,
                        minutes: bookingTotals.minutes,
                      })}
                    </p>
                  ) : null}
                  {freePackageNotes}
                  {roomCharges && (roomCharges.now.length || roomCharges.atEnd.length || optionalCharges.length) ? (
                    <div className="space-y-2 rounded border border-slate-700 bg-slate-950 p-3">
                      <p className="text-sm font-semibold">{tr("roomCharges")}</p>
                      {roomCharges.now
                        .filter((line) => line.charge.autoApply)
                        .map((line) => (
                          <p key={line.charge.variantId} className="flex justify-between text-sm text-slate-300">
                            <span>
                              {line.charge.name}
                              {line.units > 1 ? ` × ${line.units}` : ""}
                              <span className="ml-1 text-xs text-slate-500">{tr("roomChargeAuto")}</span>
                              {line.free ? (
                                <span className="ml-1 text-xs text-emerald-300">
                                  {tr("roomChargeFree", { count: line.free.units })}
                                </span>
                              ) : null}
                            </span>
                            <span>{money(line.amount - saving(line.charge.variantId))}</span>
                          </p>
                        ))}
                      {optionalCharges.length ? (
                        <div className="flex flex-wrap gap-2">
                          {optionalCharges.map((item) => {
                            const on = pickedCharges.includes(item.variantId);
                            return (
                              <button
                                key={item.variantId}
                                type="button"
                                aria-pressed={on}
                                onClick={() =>
                                  setPickedCharges((current) =>
                                    on
                                      ? current.filter((id) => id !== item.variantId)
                                      : [...current, item.variantId]
                                  )
                                }
                                className={`rounded border px-2 py-1 text-sm ${
                                  on ? "border-emerald-500 bg-emerald-950/40" : "border-slate-700"
                                }`}
                              >
                                {on ? "✓ " : "+ "}
                                {item.name} · {money(item.unitPrice)}
                                {item.soldBy === "TIME"
                                  ? ` / ${tr("roomChargeBlock", { minutes: item.blockMinutes })}`
                                  : ""}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {roomCharges.now
                        .filter((line) => !line.charge.autoApply && (line.free || saving(line.charge.variantId)))
                        .map((line) => (
                          <p key={line.charge.variantId} className="flex justify-between text-sm text-emerald-300">
                            <span>
                              {line.charge.name}
                              {line.free ? ` · ${tr("roomChargeFree", { count: line.free.units })}` : ""}
                            </span>
                            <span>{money(line.amount - saving(line.charge.variantId))}</span>
                          </p>
                        ))}
                      {roomCharges.atEnd.map((item) => (
                        <p key={item.variantId} className="text-xs text-slate-400">
                          {tr("roomChargeClock", { name: item.name })}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
              <>
              {rentals.length > 1 ? (
                <div className="space-y-1">
                  <span className="text-sm text-slate-300">{tr("chooseRental")}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {rentals.map((item) => (
                      <button
                        key={item.variantId}
                        type="button"
                        aria-pressed={rental?.variantId === item.variantId}
                        onClick={() => {
                          setRentalVariantId(item.variantId);
                          setSessionCount((count) => Math.max(item.minimumUnits, count));
                        }}
                        className={`rounded border p-2 text-left text-sm ${
                          rental?.variantId === item.variantId
                            ? "border-emerald-500 bg-emerald-950/40"
                            : "border-slate-700 bg-slate-950"
                        }`}
                      >
                        <span className="block font-semibold">{item.name}</span>
                        <span className="block text-xs text-slate-400">
                          {tr("rentalPrice", {
                            price: money(
                              item.variantId === room.rateVariantId
                                ? room.sessionPrice ?? item.unitPrice
                                : item.unitPrice
                            ),
                            minutes: item.blockMinutes,
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">{tr("sessions")}</span>
                <div className="flex items-center rounded bg-slate-800">
                  <button
                    type="button"
                    aria-label={tr("fewerSessions")}
                    className="h-9 w-9 text-lg disabled:opacity-40"
                    disabled={sessionCount <= minimumUnits}
                    onClick={() => setSessionCount((count) => Math.max(minimumUnits, count - 1))}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold">{sessionCount}</span>
                  <button
                    type="button"
                    aria-label={tr("moreSessions")}
                    className="h-9 w-9 text-lg"
                    onClick={() => setSessionCount((count) => count + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-300">
                {tr("sessionsSummary", {
                  minutes: (sessionCount + (freeTime?.units || 0)) * unitMinutes,
                  perSession: unitMinutes,
                })}
                {roomSessionPrice ? ` · ${money(startCharge)}` : ""}
              </p>
              {hoursSaving > 0 && !session ? (
                <p className="text-sm text-emerald-300">
                  {tr("promotionDiscount")} −{money(hoursSaving)}
                </p>
              ) : null}
              {freeTime ? (
                <p className="rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-1 text-sm text-emerald-200">
                  {tr("freeTimeAdded", { count: freeTime.units, name: freeTime.name })}
                </p>
              ) : null}
              </>
              )}
              <label className="block text-sm text-slate-300">
                {tr("guestCountLabel")}
                <input
                  type="number"
                  min={1}
                  max={room.capacity}
                  value={guestCount}
                  onChange={(event) => setGuestCount(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                />
              </label>
              {isSpa ? (
                <Button type="submit" isLoading={isLoading} disabled={!bookingTotals.count}>
                  {!bookingTotals.count
                    ? tr("choosePackage")
                    : startsAtEnd
                      ? tr("startOnBill", { amount: money(bookingDue + roomChargesDue) })
                      : tr("startAndPay", { amount: money(bookingDue + roomChargesDue) })}
                </Button>
              ) : (
                <Button type="submit" isLoading={isLoading}>
                  {roomSessionPrice === undefined
                    ? tr("startSession")
                    : startsAtEnd
                      ? tr("startOnBill", { amount: money(startCharge) })
                      : tr("startAndPay", { amount: money(startCharge) })}
                </Button>
              )}
            </form>
          ) : null}
          {openSessions.length === 0 && room.status !== "AVAILABLE" ? (
            <p className="text-slate-400">
              {tr("roomNotAvailable", {
                status: tr(`status.${room.status.toLowerCase()}`),
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      {(step === "menu" || step === "pay") && session ? (
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <SpaBillPanel
            kind={kind}
            room={room}
            session={liveSession || session}
            card={card}
            wallet={wallet}
            quote={quote}
            lines={orderLines}
            itemNames={itemNames}
            nowMs={nowMs}
            isBusy={isLoading || isPaying || isAdding}
            billClosed={billClosed}
            primaryLabel={
              quote?.prepaid
                ? tr("endTreatment")
                : step === "menu"
                  ? tr("goToPay")
                  : tr("addServices")
            }
            onPrimary={() =>
              quote?.prepaid
                ? pending.length
                  ? setActionError(tr("errors.pendingItems"))
                  : setConfirmEnd(true)
                : step === "menu"
                  ? goToPay()
                  : setStep("menu")
            }
            onExtend={() => {
              setExtendCount(1);
              setExtendChoice({});
              setShowExtend(true);
            }}
            onTogglePause={() => void togglePause()}
            onChangeQuantity={(line) => void reduceLine(line)}
            onAddAnother={addAnother}
            onRemoveLine={(line) => void removeLine(line)}
            pending={pending}
            onPendingChange={(variantId, delta) =>
              setPending((current) => changePending(current, variantId, delta))
            }
            onClearPending={() => setPending([])}
            onCommitPending={addPendingToBill}
            onToggleFoc={(key) => setPending((current) => toggleOneFoc(current, key))}
            onChangeCard={forgetCard}
            promotions={promotions.running}
            pendingDiscounts={promotions.discounts}
            promotionName={promotions.promotionName}
            packageVariantIds={packageVariantIds}
          />

          {step === "menu" && !menuAllowed && isSpa ? (
            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-5">
              {roomChargeChips}
              <div>
                <h2 className="text-lg font-semibold text-white">{tr("addPackageTitle")}</h2>
                <p className="mt-1 text-sm text-slate-400">{tr("addPackageHint")}</p>
              </div>
              <PackagePicker
                kind={kind}
                packages={spaPackages}
                choice={extendChoice}
                discounts={promotions.discounts}
                onChange={(id, delta) => setExtendChoice((current) => changeChoice(current, id, delta))}
              />
              {bookingTotals.count ? (
                <p className="text-sm text-slate-300">
                  {tr("packagesSummary", { count: bookingTotals.count, minutes: bookingTotals.minutes })}
                  {` · ${money(bookingDue)}`}
                </p>
              ) : null}
              {freePackageNotes}
              <Button
                isLoading={isAdding}
                disabled={!bookingTotals.count || billClosed}
                onClick={() => (atEnd ? void extendOnBill() : requestCard("extend"))}
              >
                {atEnd ? tr("addToBillShort") : tr("extendAndPay")}
              </Button>
            </div>
          ) : step === "menu" && !menuAllowed ? (
            <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">{tr("menuOffTitle")}</h2>
              <p className="text-sm text-slate-300">{tr("menuOffBody")}</p>
            </div>
          ) : step === "menu" ? (
            <div className="flex min-h-0 flex-col gap-2">
              {roomChargeChips}
              <div className="min-h-0 flex-1">
                <ProductMenu
                  products={menuProducts}
                  groupByCategory
                  variantsByProductId={variantsByProductId}
                  orderedProductQuantities={pendingByProduct}
                  onLoadVariants={fetchProductVariants}
                  onAdd={handleAddProduct}
                  onClose={goToPay}
                />
              </div>
            </div>
          ) : paid ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">{tr("paidTitle")}</h2>
              <p className="mt-3">
                {tr("paidSummary", {
                  amount: money(paid.grandTotal),
                  order: paid.orderNumber,
                })}
              </p>
              {Number(paid.change) > 0 ? (
                <p>{tr("change", { amount: money(paid.change) })}</p>
              ) : null}
              <p className="mt-2 text-sm text-slate-400">
                {tr("balance", { amount: money(wallet?.balance) })}
              </p>
              <Button className="mt-4" onClick={backToBoard}>
                {tr("nextGuest")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-slate-700 p-5">
              <h2 className="text-lg font-bold">{tr("payTitle")}</h2>
              {wallet?.discountBpsSnapshot ? (
                <p className="text-sm text-slate-300">
                  {tr("memberDiscount", {
                    tier: wallet.tierNameSnapshot,
                    percent: wallet.discountBpsSnapshot / 100,
                  })}
                </p>
              ) : null}
              <label className="block text-sm">
                {tr("tip")}
                <input
                  type="number"
                  min={0}
                  value={tip}
                  onChange={(event) => setTip(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                />
              </label>
              {cashMethod ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={splitCash}
                    onChange={(event) => setSplitCash(event.target.checked)}
                  />
                  {tr("splitCash")}
                </label>
              ) : null}
              {splitCash ? (
                <label className="block text-sm">
                  {tr("cashAmount")}
                  <input
                    type="number"
                    min={0}
                    value={cashAmount}
                    onChange={(event) => setCashAmount(event.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                  />
                </label>
              ) : null}
              <p className="text-sm text-slate-300">
                {tr("estimatedCard", { amount: money(estimatedCard) })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" disabled={!wallet} onClick={openTopup}>
                  {tr("topUpCard")}
                </Button>
                <Button isLoading={isPaying} onClick={() => void handlePay()}>
                  {billClosed ? tr("retryPay") : tr("confirmPay")}
                </Button>
              </div>
              {atEnd && otherMethods.length ? (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <p className="text-sm font-semibold">{tr("payOtherTitle")}</p>
                  <p className="text-xs text-slate-400">
                    {tr("payOtherHint", { amount: money(Number(quote?.amountDue || quote?.runningTotal || 0) + tipValue) })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {otherMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        aria-pressed={otherMethodId === method.id}
                        onClick={() => setOtherMethodId(method.id)}
                        className={`rounded border px-3 py-1.5 text-sm ${
                          otherMethodId === method.id
                            ? "border-emerald-500 bg-emerald-500/15"
                            : "border-slate-700"
                        }`}
                      >
                        {method.name}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    isLoading={isPaying}
                    disabled={!otherMethodId}
                    onClick={() => void handlePayOther()}
                  >
                    {tr("payWith", {
                      method: otherMethods.find((item) => item.id === otherMethodId)?.name || "",
                    })}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {hostessFor ? (
        <HostessPicker
          serviceName={hostessFor.product.name}
          onPick={pickHostess}
          onCancel={() => setHostessFor(null)}
        />
      ) : null}

      {cardPrompt ? (
        <CardTapDialog
          kind={kind}
          title={cardPromptTitle}
          error={cardPromptError}
          isBusy={isCheckingCard}
          onCardRead={(uid) => void handleCardRead(uid)}
          onCancel={() => setCardPrompt(null)}
          otherMethods={cardPrompt !== "pay" ? otherMethods : []}
          onPayWith={payWith}
        >
          {cardPrompt === "add" ? (
            <>
              {paidPending(pending).map((item) => (
                <p key={item.variantId} className="flex justify-between">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{money(item.unitPrice * item.quantity)}</span>
                </p>
              ))}
              {pendingDue < pendingTotal(pending) ? (
                <p className="flex justify-between text-emerald-300">
                  <span>{tr("promotionDiscount")}</span>
                  <span>−{money(pendingTotal(pending) - pendingDue)}</span>
                </p>
              ) : null}
              <p className="mt-1 flex justify-between border-t border-slate-800 pt-1 font-semibold">
                <span>{tr("newItemsTotal")}</span>
                <span>{money(pendingDue)}</span>
              </p>
            </>
          ) : isSpa && (cardPrompt === "extend" || cardPrompt === "open") ? (
            <>
              {chosenPackages(booking, spaPackages).map(({ package: item, quantity }) => (
                <p key={item.id} className="flex justify-between gap-2">
                  <span>
                    {item.name} × {quantity}
                  </span>
                  <span>{money(item.price * quantity)}</span>
                </p>
              ))}
              {cardPrompt === "open"
                ? roomCharges?.now.map((line) => (
                    <p key={line.charge.variantId} className="flex justify-between gap-2">
                      <span>
                        {line.charge.name}
                        {line.units > 1 ? ` × ${line.units}` : ""}
                        {line.free ? ` · ${tr("roomChargeFree", { count: line.free.units })}` : ""}
                      </span>
                      <span>{money(line.amount)}</span>
                    </p>
                  ))
                : null}
              {freePackages.map(({ package: item, free }) => (
                <p key={item.id} className="flex justify-between gap-2 text-emerald-300">
                  <span>{tr("freePackageAdded", { count: free.units, package: item.name, name: free.name })}</span>
                  <span>{money(0)}</span>
                </p>
              ))}
              {bookingDue < bookingTotals.price || (cardPrompt === "open" && roomChargesSaving) ? (
                <p className="flex justify-between text-emerald-300">
                  <span>{tr("promotionDiscount")}</span>
                  <span>
                    −{money(bookingTotals.price - bookingDue + (cardPrompt === "open" ? roomChargesSaving : 0))}
                  </span>
                </p>
              ) : null}
              <p className="mt-1 flex justify-between border-t border-slate-800 pt-1 font-semibold">
                <span>{tr("packagesSummary", { count: bookingTotals.count, minutes: bookingTotals.minutes })}</span>
                <span>{money(bookingDue + (cardPrompt === "open" ? roomChargesDue : 0))}</span>
              </p>
            </>
          ) : cardPrompt === "extend" ? (
            <p className="flex justify-between font-semibold">
              <span>
                {tr("sessionsSummary", {
                  minutes: extendCount * sessionMinutes(room),
                  perSession: sessionMinutes(room),
                })}
              </span>
              {roomSessionPrice ? <span>{money(extendCharge)}</span> : null}
            </p>
          ) : cardPrompt === "open" ? (
            <>
              <p className="flex justify-between gap-2">
                <span>
                  {tr("startSummary", {
                    room: room?.roomNumber || "",
                    sessions: sessionCount,
                    minutes: sessionCount * sessionMinutes(room),
                    count: Math.max(1, Number(guestCount) || 1),
                  })}
                </span>
                {roomSessionPrice !== undefined ? <span>{money(startCharge)}</span> : null}
              </p>
              {hoursSaving ? (
                <p className="flex justify-between text-emerald-300">
                  <span>{tr("promotionDiscount")}</span>
                  <span>−{money(hoursSaving)}</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="flex justify-between font-semibold">
              <span>{tr("runningTotal")}</span>
              <span>{money(quote?.runningTotal)}</span>
            </p>
          )}
        </CardTapDialog>
      ) : null}

      {showFoc && session ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-5">
            <div>
              <h2 className="text-lg font-bold">
                {tr("focTitle", { room: room?.roomNumber || "" })}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{tr("focDescription")}</p>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded border border-slate-800 bg-slate-900/60 p-3 text-sm">
              {focPending(pending).map((item) => (
                <p key={item.variantId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="shrink-0 text-slate-500 line-through">
                    {money(item.unitPrice * item.quantity)}
                  </span>
                </p>
              ))}
              <p className="mt-1 flex justify-between border-t border-slate-800 pt-1 font-semibold">
                <span>{tr("toPay")}</span>
                <span>0</span>
              </p>
            </div>
            <label className="block text-sm">
              {tr("focReason")}
              <input
                value={focReason}
                onChange={(event) => setFocReason(event.target.value)}
                list="foc-reasons"
                maxLength={100}
                placeholder={tr("focReasonPlaceholder")}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                autoFocus
              />
              <datalist id="foc-reasons">
                {discountReasons.map((reason) => (
                  <option key={reason.id} value={reason.name} />
                ))}
              </datalist>
            </label>
            {discountReasons.length ? (
              <div className="flex flex-wrap gap-1.5">
                {discountReasons.slice(0, 6).map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      focReason === reason.name
                        ? "bg-slate-100 text-slate-900"
                        : "bg-slate-800 text-slate-300"
                    }`}
                    onClick={() => setFocReason(reason.name)}
                  >
                    {reason.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setShowFoc(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                isLoading={isGivingFoc}
                disabled={!focReason.trim()}
                onClick={() => void confirmFoc()}
              >
                {tr("focConfirm")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showExtend && session ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-lg border border-slate-700 bg-slate-950 p-5">
            <h2 className="text-lg font-bold">{tr("extendTitle", { room: room?.roomNumber || "" })}</h2>
            {isSpa ? (
              <>
                <PackagePicker
                  kind={kind}
                  packages={spaPackages}
                  choice={extendChoice}
                  discounts={promotions.discounts}
                  onChange={(id, delta) => setExtendChoice((current) => changeChoice(current, id, delta))}
                />
                {bookingTotals.count ? (
                  <p className="text-sm text-slate-300">
                    {tr("packagesSummary", { count: bookingTotals.count, minutes: bookingTotals.minutes })}
                    {` · ${money(bookingDue)}`}
                  </p>
                ) : null}
                {freePackageNotes}
              </>
            ) : (
              <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">{tr("moreSessionsLabel")}</span>
              <div className="flex items-center rounded bg-slate-800">
                <button
                  type="button"
                  aria-label={tr("fewerSessions")}
                  className="h-9 w-9 text-lg disabled:opacity-40"
                  disabled={extendCount <= 1}
                  onClick={() => setExtendCount((count) => Math.max(1, count - 1))}
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold">{extendCount}</span>
                <button
                  type="button"
                  aria-label={tr("moreSessions")}
                  className="h-9 w-9 text-lg"
                  onClick={() => setExtendCount((count) => count + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              {tr("sessionsSummary", {
                minutes: extendCount * sessionMinutes(room),
                perSession: sessionMinutes(room),
              })}
              {roomSessionPrice ? ` · ${money(extendCharge)}` : ""}
            </p>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setShowExtend(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                isLoading={isAdding}
                disabled={isSpa && !bookingTotals.count}
                onClick={() => (atEnd ? void extendOnBill() : requestCard("extend"))}
              >
                {atEnd ? tr("addToBillShort") : tr("extendAndPay")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmEnd && session ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-lg border border-slate-600 bg-slate-950 p-5">
            <h2 className="text-lg font-bold">{tr("endTitle", { room: room?.roomNumber || "" })}</h2>
            <p className="text-sm text-slate-300">
              {tr("endDescription", { amount: money(quote?.paidTotal) })}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmEnd(false)}>
                {t("common.cancel")}
              </Button>
              <Button isLoading={isPaying} onClick={() => void endTreatment()}>
                {tr("endTreatment")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {balanceWarning ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg border border-amber-500/50 bg-slate-950 p-5">
            <h2 className="text-lg font-semibold text-amber-200">{tr("insufficientTitle")}</h2>
            <p className="text-sm text-slate-300">
              {tr("balanceVsTotal", {
                balance: money(balanceWarning.balance),
                total: money(
                  estimateCardCharge({
                    runningTotal: Number(quote?.runningTotal || 0) + pendingDue,
                    discountBps: balanceWarning.discountBpsSnapshot,
                  })
                ),
              })}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="secondary" onClick={() => setBalanceWarning(null)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={openTopup}>{tr("topUpCard")}</Button>
              {!quote?.prepaid && card ? (
                <Button
                  variant="secondary"
                  onClick={() => void commitPending(balanceWarning, card, true)}
                >
                  {tr("addAnyway")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showRoomForm ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <form
            className="grid w-full max-w-2xl grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-950 p-5"
            onSubmit={handleSaveRoom}
          >
            <h2 className="col-span-2 text-lg font-bold">
              {editingRoom ? tr("editRoom") : tr("addRoom")}
            </h2>
            {(
              [
                ["roomNumber", "spa.roomNumber"],
                ["name", "spa.roomName"],
                ["capacity", "spa.capacityLabel"],
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
                  required={key !== "name"}
                />
              </label>
            ))}
            {!isSpa ? (
            <label className="text-sm">
              {tr("sessionPriceLabel")}
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={roomForm.sessionPrice}
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, sessionPrice: event.target.value }))
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                required
              />
            </label>
            ) : null}
            <p className="col-span-2 text-xs text-slate-400">
              {isSpa
                ? tr("roomNoPriceHint")
                : roomForm.sessionPrice !== ""
                ? tr("priceSummary", {
                    price: money(roomForm.sessionPrice),
                    minutes: roomForm.treatmentMinutes,
                    grace: roomForm.graceMinutes,
                  })
                : tr("priceHint")}
            </p>
            <div className="col-span-2 flex justify-end gap-2">
              {editingRoom ? (
                <Button
                  variant="destructive"
                  disabled={Boolean(findActiveSpaSession(editingRoom))}
                  onClick={() =>
                    void deleteRoom(editingRoom.id).then(() => setShowRoomForm(false))
                  }
                >
                  {tr("retireRoom")}
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
