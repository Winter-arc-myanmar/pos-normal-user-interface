import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/Toaster";
import { SpaBoardPage } from "../SpaBoardPage";

let promotionState: {
  running: Record<string, unknown>[];
  discounts: Record<string, { discount: number; names: string[] }>;
  promotionName: (id: string | undefined) => string | undefined;
} = { running: [], discounts: {}, promotionName: () => undefined };

let placeChargesState: Record<string, unknown>[] = [];

let spaPackages: {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  variantId: string;
  items: { name: string; quantity: number }[];
}[] = [];

let venueState: {
  paymentTiming: "PAY_WHEN_ORDERING" | "PAY_AT_END";
  spaMenuOrdering?: boolean;
  ktvMenuOrdering?: boolean;
} = {
  paymentTiming: "PAY_WHEN_ORDERING",
};

const mocks = vi.hoisted(() => ({
  fetchBoard: vi.fn(),
  getQuote: vi.fn(),
  closeSession: vi.fn(),
  openSession: vi.fn(),
  fetchOrderLines: vi.fn(),
  updateOrderLine: vi.fn(),
  deleteOrderLine: vi.fn(),
  addOrderLine: vi.fn(),
  updateRoom: vi.fn(),
  chargeItems: vi.fn(),
  giveFree: vi.fn(),
  extendSession: vi.fn(),
  refundLine: vi.fn(),
  settleOrder: vi.fn(),
  lookupCard: vi.fn(),
  getWallet: vi.fn(),
  requireCashierContext: vi.fn(),
  printReceipt: vi.fn(),
  printTicket: vi.fn(),
  listKdsTickets: vi.fn(),
  noop: vi.fn(),
}));

const wallet = {
  id: "wallet-1",
  tenantId: "tenant-1",
  guestName: "Aung Aung",
  tierNameSnapshot: "Gold",
  discountBpsSnapshot: 500,
  balance: "120000.0000",
  status: "ACTIVE",
};
const card = { id: "card-1", cardUid: "04A3B2C1", walletId: "wallet-1", wallet };

const room = (guestWalletId: string) => ({
  id: "room-1",
  tenantId: "tenant-1",
  locationId: "location-1",
  roomNumber: "SUITE1",
  name: "Couple suite",
  capacity: 2,
  rateVariantId: "variant-rate",
  rateProductId: "product-room",
  sessionPrice: 30000,
  minimumMinutes: 90,
  incrementMinutes: 90,
  graceMinutes: 15,
  roundingMode: "DOWN",
  status: "OCCUPIED",
  sessions: [
    {
      id: "session-1",
      roomId: "room-1",
      guestWalletId,
      salesOrderId: "order-1",
      guestCount: 2,
      openedAt: "2026-09-26T07:00:00Z",
      sessionState: "OPEN",
    },
  ],
});

let quote: Record<string, unknown> = {};
const legacyQuote = {
  sessionId: "session-1",
  roomNumber: "SUITE1",
  segments: [],
  treatmentCharge: "45000.0000",
  servicesCharge: "8000.0000",
  runningTotal: "53000.0000",
};

const scrub = {
  id: "product-scrub",
  tenantId: "tenant-1",
  name: "Foot Scrub",
  categoryName: "Spa Services",
  trackingType: "SERVICE",
  basePrice: "6000.0000",
};
const beer = {
  id: "product-beer",
  tenantId: "tenant-1",
  name: "Myanmar Beer",
  categoryName: "Beer & Spirits",
  trackingType: "STANDARD",
  basePrice: "3500.0000",
};
const roomRate = {
  id: "product-room",
  tenantId: "tenant-1",
  name: "Spa room SUITE1",
  categoryName: "Spa Rooms",
  trackingType: "SERVICE",
  basePrice: "30000.0000",
};
const thaiPackageProduct = {
  id: "product-pkg-thai",
  tenantId: "tenant-1",
  name: "Thai massage 90 min",
  categoryName: "Spa Packages",
  trackingType: "SERVICE",
  basePrice: "45000.0000",
};
const ktvRoomProduct = {
  id: "product-ktv-r1",
  tenantId: "tenant-1",
  name: "KTV room R-01",
  categoryName: "KTV Rooms",
  trackingType: "SERVICE",
  basePrice: "50000.0000",
};
const scrubVariant = { id: "variant-scrub", productId: "product-scrub", priceModifier: "0" };

let rooms = [room("wallet-1")];
let lines: Record<string, unknown>[] = [];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", tenantId: "tenant-1", name: "Cashier" } }),
}));

vi.mock("@/core/presentation/hooks/usePrinterConnection", () => ({
  usePrinterConnection: () => ({
    printReceipt: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => null,
}));

vi.mock("@/core/presentation/hooks/useSpaManagement", () => ({
  useSpaManagement: () => ({
    rooms,
    quote,
    isLoading: false,
    error: null,
    fetchBoard: mocks.fetchBoard,
    createRoom: mocks.noop,
    updateRoom: mocks.updateRoom,
    deleteRoom: mocks.noop,
    markRoomReady: mocks.noop,
    openSession: mocks.openSession,
    getQuote: mocks.getQuote,
    pauseSession: mocks.noop,
    resumeSession: mocks.noop,
    closeSession: mocks.closeSession,
    chargeItems: mocks.chargeItems,
    giveFree: mocks.giveFree,
    extendSession: mocks.extendSession,
    refundLine: mocks.refundLine,
    clearQuote: mocks.noop,
  }),
}));

vi.mock("@/core/presentation/hooks/useVenueSetting", () => ({
  useVenueSetting: () => ({ spaMenuOrdering: true, ktvMenuOrdering: true, ...venueState }),
}));

vi.mock("@/core/presentation/hooks/useSpaPackages", () => ({
  useSpaPackages: () => ({ packages: spaPackages, error: null }),
}));

vi.mock("@/core/presentation/hooks/usePlaceCharges", () => ({
  usePlaceCharges: () => placeChargesState,
}));
vi.mock("@/core/presentation/hooks/useWorkingHostesses", () => ({
  useWorkingHostesses: () => ({ hostesses: [], isLoading: false, error: null, load: () => undefined }),
}));
vi.mock("@/core/presentation/hooks/useRoomPromotions", () => ({
  useRoomPromotions: () => promotionState,
}));

vi.mock("@/core/presentation/hooks/useKtvManagement", () => ({
  useKtvManagement: () => ({ rooms: [], quote: null }),
}));

vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    products: [scrub, beer, roomRate, thaiPackageProduct, ktvRoomProduct],
    variantsByProductId: {
      "product-scrub": [scrubVariant],
      "product-beer": [{ id: "variant-beer", productId: "product-beer", priceModifier: "0" }],
    },
    paymentMethods: [
      { id: "card-method", tenantId: "tenant-1", name: "Guest Card", kind: "GUEST_CARD" },
      { id: "cash-method", tenantId: "tenant-1", name: "Cash", kind: "CASH" },
    ],
    discountReasons: [{ id: "reason-foc", name: "Birthday", isActive: true }],
    fetchDiscountReasons: () => Promise.resolve(),
    fetchProducts: mocks.noop,
    fetchProductVariants: mocks.noop,
    fetchPaymentMethods: mocks.noop,
    listKdsTickets: mocks.listKdsTickets,
  }),
}));

vi.mock("@/core/presentation/hooks/useSalesOrderManagement", () => ({
  useSalesOrderManagement: () => ({
    orderLines: lines,
    fetchOrderLines: mocks.fetchOrderLines,
    addOrderLine: mocks.addOrderLine,
    updateOrderLine: mocks.updateOrderLine,
    deleteOrderLine: mocks.deleteOrderLine,
    settleOrder: mocks.settleOrder,
  }),
}));

vi.mock("@/core/presentation/hooks/useGuestWalletManagement", () => ({
  useGuestWalletManagement: () => ({
    lookupCard: mocks.lookupCard,
    getWallet: mocks.getWallet,
  }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({
    activeLocationId: "location-1",
    activePosRegisterId: "register-1",
    isWorkspaceReady: true,
    requireCashierContext: mocks.requireCashierContext,
  }),
}));

vi.mock("@/core/presentation/hooks/usePrinterConnection", () => ({
  usePrinterConnection: () => ({
    printReceipt: mocks.printReceipt,
    printKitchen: vi.fn(),
    printTicket: mocks.printTicket,
    error: null,
  }),
}));

vi.mock("@/core/presentation/hooks/useCardCapture", () => ({
  useCardCapture: () => ({
    nfcSupported: false,
    nfcActive: false,
    nfcError: null,
    lastUid: "",
    startNfc: vi.fn(),
  }),
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/spa"]}>
      <SpaBoardPage />
      <Toaster />
    </MemoryRouter>
  );

const openRunningRoom = async () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: /SUITE1/ }));
  await screen.findByRole("button", { name: "spa.pause" });
};

const tapCard = async (uid = "04A3B2C1") => {
  fireEvent.change(await screen.findByPlaceholderText("spa.cardUid"), {
    target: { value: uid },
  });
  fireEvent.click(screen.getByRole("button", { name: "spa.checkCard" }));
};

describe("SpaBoardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    placeChargesState = [];
    venueState = { paymentTiming: "PAY_WHEN_ORDERING" };
    rooms = [room("wallet-1")];
    lines = [];
    quote = legacyQuote;
    mocks.fetchBoard.mockResolvedValue(rooms);
    mocks.getQuote.mockImplementation(() => Promise.resolve(quote));
    mocks.fetchOrderLines.mockResolvedValue({ lines: [] });
    mocks.addOrderLine.mockResolvedValue({ id: "line-new" });
    mocks.closeSession.mockImplementation(() => Promise.resolve({ ...quote, state: "CLOSED" }));
    mocks.lookupCard.mockResolvedValue(card);
    mocks.getWallet.mockResolvedValue(wallet);
    mocks.requireCashierContext.mockResolvedValue({
      tenantId: "tenant-1",
      locationId: "location-1",
      posRegisterId: "register-1",
      posSessionId: "pos-session-1",
    });
    mocks.settleOrder.mockResolvedValue({
      orderId: "order-1",
      orderNumber: "SO-001",
      grandTotal: "50350.0000",
      totalPaid: "50350.0000",
      change: "0.0000",
      status: "COMPLETED",
    });
    mocks.printReceipt.mockResolvedValue(undefined);
    mocks.printTicket.mockResolvedValue({ jobs: [], unrouted: [], missingPrinterRoutes: [] });
    mocks.listKdsTickets.mockResolvedValue({ tickets: [] });
    promotionState = { running: [], discounts: {}, promotionName: () => undefined };
    spaPackages = [
      {
        id: "pkg-thai",
        name: "Thai massage 90 min",
        durationMinutes: 90,
        price: 45000,
        variantId: "variant-pkg-thai",
        items: [],
      },
      {
        id: "pkg-foot",
        name: "Foot massage + juice",
        durationMinutes: 60,
        price: 30000,
        variantId: "variant-pkg-foot",
        items: [{ name: "Orange juice", quantity: 1 }],
      },
    ];
  });

  it("opens a running room's bill and menu without asking for a card", async () => {
    await openRunningRoom();

    expect(mocks.getQuote).toHaveBeenCalledWith("session-1");
    expect(screen.getByText("spa.noCardYet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Foot Scrub/ })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("spa.cardUid")).not.toBeInTheDocument();
  });

  it("collects items in the tray, then adds them all after one card tap", async () => {
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
    fireEvent.click(await screen.findByRole("button", { name: "spa.increaseNew" }));
    expect(mocks.addOrderLine).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /spa.addToBill/ }));
    await tapCard();

    await waitFor(() =>
      expect(mocks.addOrderLine).toHaveBeenCalledWith("order-1", {
        variantId: "variant-scrub",
        quantity: "2.0000",
        unitPrice: "6000.0000",
        lineDiscount: "0.0000",
      })
    );
    expect(await screen.findByText("spa.itemsAdded")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("spa.cardUid")).not.toBeInTheDocument();
  });

  it("asks for a card tap for every order", async () => {
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
    fireEvent.click(await screen.findByRole("button", { name: /spa.addToBill/ }));
    await tapCard();
    await waitFor(() => expect(mocks.addOrderLine).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
    fireEvent.click(await screen.findByRole("button", { name: /spa.addToBill/ }));

    expect(await screen.findByPlaceholderText("spa.cardUid")).toBeInTheDocument();
    expect(mocks.addOrderLine).toHaveBeenCalledTimes(1);
    await tapCard();
    await waitFor(() => expect(mocks.addOrderLine).toHaveBeenCalledTimes(2));
    expect(mocks.lookupCard).toHaveBeenCalledTimes(2);
  });

  it("keeps the dialog open for a card that did not open the treatment", async () => {
    rooms = [room("someone-else")];
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
    fireEvent.click(await screen.findByRole("button", { name: /spa.addToBill/ }));
    await tapCard();

    expect(await screen.findByText("spa.errors.wrongSessionCard")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("spa.cardUid")).toBeInTheDocument();
    expect(mocks.addOrderLine).not.toHaveBeenCalled();
  });

  it("closes the treatment, then settles its bill on the card under one key", async () => {
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: "spa.goToPay" }));
    await tapCard();
    fireEvent.click(await screen.findByRole("button", { name: "spa.confirmPay" }));

    await waitFor(() =>
      expect(mocks.settleOrder).toHaveBeenCalledWith("order-1", {
        payments: [{ paymentMethodId: "card-method", guestCardId: "card-1" }],
        posSessionId: "pos-session-1",
        idempotencyKey: "spa-settle-session-1",
      })
    );
    expect(mocks.closeSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.settleOrder.mock.invocationCallOrder[0]
    );
    expect(await screen.findByText("spa.paidTitle")).toBeInTheDocument();
    expect(mocks.printReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "RECEIPT",
        serviceType: "SPA",
        tableOrRoom: "SUITE1",
        startTime: expect.any(String),
        endTime: expect.any(String),
      })
    );
  });

  it("splits the bill with cash when asked", async () => {
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: "spa.goToPay" }));
    await tapCard();
    fireEvent.click(await screen.findByLabelText("spa.splitCash"));
    fireEvent.change(screen.getByLabelText("spa.cashAmount"), {
      target: { value: "20000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "spa.confirmPay" }));

    await waitFor(() =>
      expect(mocks.settleOrder).toHaveBeenCalledWith(
        "order-1",
        expect.objectContaining({
          payments: [
            { paymentMethodId: "cash-method", amount: "20000.0000" },
            { paymentMethodId: "card-method", guestCardId: "card-1" },
          ],
        })
      )
    );
  });

  it("fixes a wrong line without a card by lowering or removing it", async () => {
    lines = [
      {
        id: "line-1",
        salesOrderId: "order-1",
        variantId: "variant-scrub",
        productName: "Foot Scrub",
        quantity: "2.0000",
        unitPrice: "6000.0000",
        status: "PENDING",
      },
    ];
    await openRunningRoom();

    fireEvent.click(screen.getByRole("button", { name: "spa.decrease" }));
    await waitFor(() =>
      expect(mocks.updateOrderLine).toHaveBeenCalledWith("order-1", "line-1", {
        quantity: "1.0000",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "spa.removeLine" }));
    await waitFor(() =>
      expect(mocks.deleteOrderLine).toHaveBeenCalledWith("order-1", "line-1")
    );
    expect(mocks.lookupCard).not.toHaveBeenCalled();
  });

  it("gives items free with a reason and no card tap", async () => {
    mocks.giveFree.mockResolvedValue({ charged: "0", balanceAfter: "120000", quote });
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
    fireEvent.click(await screen.findByRole("button", { name: "spa.focToggle" }));
    fireEvent.click(screen.getByRole("button", { name: "spa.giveFreeCount" }));

    const confirm = screen.getByRole("button", { name: "spa.focConfirm" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("spa.focReason"), {
      target: { value: "Birthday" },
    });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(mocks.giveFree).toHaveBeenCalledWith("session-1", {
        items: [{ variantId: "variant-scrub", quantity: 1 }],
        reason: "Birthday",
      })
    );
    expect(await screen.findByText("spa.focGiven")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("spa.cardUid")).not.toBeInTheDocument();
    expect(mocks.addOrderLine).not.toHaveBeenCalled();
  });

  it("prints the kitchen tickets the order just got", async () => {
    const earlier = { id: "ticket-old", salesOrderId: "order-1" };
    const fresh = { id: "ticket-new", salesOrderId: "order-1" };
    mocks.listKdsTickets
      .mockResolvedValueOnce({ tickets: [earlier] })
      .mockResolvedValueOnce({ tickets: [earlier, fresh] });
    mocks.giveFree.mockResolvedValue({ charged: "0", balanceAfter: "120000", quote });
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
    fireEvent.click(await screen.findByRole("button", { name: "spa.focToggle" }));
    fireEvent.click(screen.getByRole("button", { name: "spa.giveFreeCount" }));
    fireEvent.change(screen.getByLabelText("spa.focReason"), {
      target: { value: "Birthday" },
    });
    fireEvent.click(screen.getByRole("button", { name: "spa.focConfirm" }));

    await waitFor(() => expect(mocks.printTicket).toHaveBeenCalledWith(fresh));
    expect(mocks.printTicket).toHaveBeenCalledTimes(1);
    expect(mocks.listKdsTickets).toHaveBeenCalledWith({ salesOrderId: "order-1", limit: 100 });
  });

  it("says when the kitchen slip did not print", async () => {
    mocks.listKdsTickets
      .mockResolvedValueOnce({ tickets: [] })
      .mockResolvedValueOnce({ tickets: [{ id: "ticket-new", salesOrderId: "order-1" }] });
    mocks.printTicket.mockRejectedValue(new Error("No default printer is connected"));
    mocks.giveFree.mockResolvedValue({ charged: "0", balanceAfter: "120000", quote });
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
    fireEvent.click(await screen.findByRole("button", { name: "spa.focToggle" }));
    fireEvent.click(screen.getByRole("button", { name: "spa.giveFreeCount" }));
    fireEvent.change(screen.getByLabelText("spa.focReason"), {
      target: { value: "Birthday" },
    });
    fireEvent.click(screen.getByRole("button", { name: "spa.focConfirm" }));

    expect(await screen.findByText("kds.printFailed")).toBeInTheDocument();
  });

  it("gives one of a round free and asks the card for the rest", async () => {
    mocks.giveFree.mockResolvedValue({ charged: "0", balanceAfter: "120000", quote });
    await openRunningRoom();
    fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
    fireEvent.click(await screen.findByRole("button", { name: "spa.increaseNew" }));
    fireEvent.click(screen.getByRole("button", { name: "spa.focToggle" }));
    fireEvent.click(screen.getByRole("button", { name: "spa.addToBillWithFree" }));

    fireEvent.change(screen.getByLabelText("spa.focReason"), {
      target: { value: "Birthday" },
    });
    fireEvent.click(screen.getByRole("button", { name: "spa.focConfirm" }));
    await waitFor(() =>
      expect(mocks.giveFree).toHaveBeenCalledWith("session-1", {
        items: [{ variantId: "variant-scrub", quantity: 1 }],
        reason: "Birthday",
      })
    );

    await tapCard();
    await waitFor(() =>
      expect(mocks.addOrderLine).toHaveBeenCalledWith(
        "order-1",
        expect.objectContaining({ variantId: "variant-scrub", quantity: "1.0000" })
      )
    );
    expect(mocks.addOrderLine).toHaveBeenCalledTimes(1);
  });

  it("marks a free line and lets it only be removed", async () => {
    lines = [
      {
        id: "line-foc",
        salesOrderId: "order-1",
        variantId: "variant-scrub",
        productName: "Foot Scrub",
        quantity: "1.0000",
        unitPrice: "6000.0000",
        lineDiscount: "6000.0000",
        compReasonId: "reason-foc",
        status: "PENDING",
      },
    ];
    await openRunningRoom();

    expect(screen.getByText("spa.foc", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "spa.decrease" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "spa.removeLine" }));
    await waitFor(() =>
      expect(mocks.deleteOrderLine).toHaveBeenCalledWith("order-1", "line-foc")
    );
  });

  it("shows no price or session length on a SPA room tile", () => {
    renderPage();
    expect(screen.queryByText("30,000")).not.toBeInTheDocument();
    expect(screen.queryByText("spa.perSession")).not.toBeInTheDocument();
  });

  it("saves a SPA room without a price: the package sets time and price", async () => {
    mocks.updateRoom.mockResolvedValue(room("wallet-1"));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "spa.manageRoom" }));

    expect(screen.queryByLabelText("spa.sessionPriceLabel")).not.toBeInTheDocument();
    expect(screen.getByText("spa.roomNoPriceHint")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));

    await waitFor(() =>
      expect(mocks.updateRoom).toHaveBeenCalledWith("room-1", {
        roomNumber: "SUITE1",
        name: "Couple suite",
        capacity: 2,
      })
    );
  });

  it("filters the menu by category, without the room's own price", async () => {
    await openRunningRoom();

    expect(screen.queryByRole("button", { name: /Spa room SUITE1/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Spa Services" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Foot Scrub/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Beer & Spirits" }));
    expect(screen.getByRole("button", { name: /Myanmar Beer/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Foot Scrub/ })).not.toBeInTheDocument();
  });

  it("starts a treatment with the service packages chosen, after a card tap", async () => {
    rooms = [{ ...room("wallet-1"), status: "AVAILABLE", sessions: [] }];
    mocks.openSession.mockResolvedValue({
      id: "session-2",
      roomId: "room-1",
      salesOrderId: "order-2",
      guestWalletId: "wallet-1",
      guestCount: 1,
      openedAt: "2026-09-26T08:00:00Z",
      sessionState: "OPEN",
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /SUITE1/ }));
    expect(await screen.findByRole("button", { name: "spa.choosePackage" })).toBeDisabled();

    const [moreThai] = screen.getAllByRole("button", { name: "spa.moreOf" });
    fireEvent.click(moreThai);
    fireEvent.click(moreThai);
    fireEvent.click(screen.getByRole("button", { name: "spa.startAndPay" }));
    await tapCard();

    await waitFor(() => expect(mocks.openSession).toHaveBeenCalled());
    const [[payload]] = mocks.openSession.mock.calls as [[Record<string, unknown>]];
    expect(payload).toMatchObject({
      roomId: "room-1",
      guestWalletId: "wallet-1",
      packages: [{ packageId: "pkg-thai", quantity: 2 }],
      prepay: expect.objectContaining({
        guestCardId: "card-1",
        paymentMethodId: "card-method",
        posSessionId: "pos-session-1",
      }),
    });
    expect(payload).not.toHaveProperty("sessions");
    expect(payload).not.toHaveProperty("items");
  });

  it("adds the room's automatic fee and a ticked sauna to the start", async () => {
    rooms = [{ ...room("wallet-1"), status: "AVAILABLE", sessions: [] }];
    placeChargesState = [
      {
        variantId: "variant-vip",
        productId: "product-vip",
        name: "VIP room",
        unitPrice: 15000,
        blockMinutes: 60,
        minimumUnits: 1,
        soldBy: "EACH",
        chargeMode: null,
        autoApply: true,
      },
      {
        variantId: "variant-sauna",
        productId: "product-sauna",
        name: "Sauna",
        unitPrice: 8000,
        blockMinutes: 60,
        minimumUnits: 1,
        soldBy: "TIME",
        chargeMode: "PAY_FIRST",
        autoApply: false,
      },
    ];
    mocks.openSession.mockResolvedValue({
      id: "session-2",
      roomId: "room-1",
      salesOrderId: "order-2",
      guestWalletId: "wallet-1",
      guestCount: 1,
      openedAt: "2026-09-26T08:00:00Z",
      sessionState: "OPEN",
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /SUITE1/ }));
    const [moreThai] = await screen.findAllByRole("button", { name: "spa.moreOf" });
    fireEvent.click(moreThai);

    expect(screen.getByText("spa.roomCharges")).toBeInTheDocument();
    expect(screen.getByText("VIP room")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sauna/ }));
    fireEvent.click(screen.getByRole("button", { name: "spa.startAndPay" }));
    await tapCard();

    await waitFor(() => expect(mocks.openSession).toHaveBeenCalled());
    const [[payload]] = mocks.openSession.mock.calls as [[Record<string, unknown>]];
    // The VIP fee is added by the server; only the ticked sauna is sent.
    expect(payload).toMatchObject({ roomCharges: [{ variantId: "variant-sauna" }] });
  });

  it("offers packages to extend instead of the menu when SPA food and drinks are off", async () => {
    venueState = { ...venueState, spaMenuOrdering: false };
    mocks.extendSession.mockResolvedValue({ charged: "45000.0000", balanceAfter: "75000.0000", quote });
    await openRunningRoom();

    expect(screen.getByText("spa.addPackageTitle")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Foot Scrub/ })).not.toBeInTheDocument();
    const [moreThai] = screen.getAllByRole("button", { name: "spa.moreOf" });
    fireEvent.click(moreThai);
    fireEvent.click(screen.getByRole("button", { name: "spa.extendAndPay" }));
    await tapCard();

    await waitFor(() =>
      expect(mocks.extendSession).toHaveBeenCalledWith(
        "session-1",
        expect.objectContaining({ packages: [{ packageId: "pkg-thai", quantity: 1 }] })
      )
    );
  });

  it("keeps packages and room time off the menu", async () => {
    await openRunningRoom();
    expect(screen.queryByRole("button", { name: /Thai massage 90 min/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /KTV room R-01/ })).not.toBeInTheDocument();
  });

  describe("paid at the end", () => {
    const atEndQuote = () => ({
      ...legacyQuote,
      prepaid: false,
      paidTotal: "0.0000",
      paymentTiming: "PAY_AT_END",
      amountDue: "53000.0000",
    });

    beforeEach(() => {
      venueState = { paymentTiming: "PAY_AT_END" };
      quote = atEndQuote();
      mocks.chargeItems.mockResolvedValue({ charged: "0.0000", balanceAfter: "0", quote });
      mocks.extendSession.mockResolvedValue({ charged: "0.0000", balanceAfter: "0", quote });
    });

    it("starts the room with its packages on the bill, without a card tap", async () => {
      rooms = [{ ...room("wallet-1"), status: "AVAILABLE", sessions: [] }];
      mocks.openSession.mockResolvedValue({
        id: "session-2",
        roomId: "room-1",
        salesOrderId: "order-2",
        guestCount: 1,
        openedAt: "2026-09-26T08:00:00Z",
        sessionState: "OPEN",
      });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /SUITE1/ }));
      const [moreThai] = await screen.findAllByRole("button", { name: "spa.moreOf" });
      fireEvent.click(moreThai);
      fireEvent.click(screen.getByRole("button", { name: "spa.startOnBill" }));

      await waitFor(() => expect(mocks.openSession).toHaveBeenCalled());
      const [[payload]] = mocks.openSession.mock.calls as [[Record<string, unknown>]];
      expect(payload).toMatchObject({ packages: [{ packageId: "pkg-thai", quantity: 1 }] });
      expect(payload).not.toHaveProperty("prepay");
      expect(screen.queryByPlaceholderText("spa.cardUid")).not.toBeInTheDocument();
    });

    it("adds items to the bill without a card tap", async () => {
      await openRunningRoom();
      fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
      fireEvent.click(await screen.findByRole("button", { name: /spa.addToBill/ }));

      await waitFor(() =>
        expect(mocks.chargeItems).toHaveBeenCalledWith(
          "session-1",
          expect.objectContaining({ items: [{ variantId: "variant-scrub", quantity: 1 }] })
        )
      );
      expect(mocks.chargeItems.mock.calls[0][1]).not.toHaveProperty("guestCardId");
      expect(mocks.addOrderLine).not.toHaveBeenCalled();
      expect(screen.queryByPlaceholderText("spa.cardUid")).not.toBeInTheDocument();
    });

    it("adds a package to the bill without a card tap", async () => {
      await openRunningRoom();
      fireEvent.click(screen.getByRole("button", { name: "spa.extend" }));
      const [moreThai] = screen.getAllByRole("button", { name: "spa.moreOf" });
      fireEvent.click(moreThai);
      fireEvent.click(screen.getByRole("button", { name: "spa.addToBillShort" }));

      await waitFor(() =>
        expect(mocks.extendSession).toHaveBeenCalledWith(
          "session-1",
          expect.objectContaining({ packages: [{ packageId: "pkg-thai", quantity: 1 }] })
        )
      );
      expect(mocks.extendSession.mock.calls[0][1]).not.toHaveProperty("guestCardId");
    });

    it("closes the room, then takes cash for the whole bill ", async () => {
      venueState = { paymentTiming: "PAY_AT_END" };
      mocks.closeSession.mockResolvedValue({ ...atEndQuote(), state: "CLOSED" });
      await openRunningRoom();
      fireEvent.click(screen.getByRole("button", { name: "spa.goToPay" }));

      expect(await screen.findByText("spa.payOtherTitle")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("spa.cardUid")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cash" }));
      fireEvent.click(screen.getByRole("button", { name: "spa.payWith" }));

      await waitFor(() =>
        expect(mocks.settleOrder).toHaveBeenCalledWith(
          "order-1",
          expect.objectContaining({
            payments: [{ paymentMethodId: "cash-method", amount: "53000.0000" }],
            posSessionId: "pos-session-1",
          })
        )
      );
      expect(mocks.closeSession.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.settleOrder.mock.invocationCallOrder[0]
      );
    });
  });

  describe("paid as it goes", () => {
    const charged = (amount: string, balance: string) => ({
      charged: amount,
      balanceAfter: balance,
      quote: { ...quote },
    });

    beforeEach(() => {
      quote = { ...legacyQuote, prepaid: true, paidTotal: "45000.0000" };
      mocks.chargeItems.mockResolvedValue(charged("10200.0000", "109800.0000"));
      mocks.extendSession.mockResolvedValue(charged("51000.0000", "69000.0000"));
      mocks.refundLine.mockResolvedValue(charged("-5100.0000", "114900.0000"));
    });

    it("charges the tray to the card in one go", async () => {
      await openRunningRoom();
      fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
      fireEvent.click(await screen.findByRole("button", { name: "spa.increaseNew" }));
      fireEvent.click(screen.getByRole("button", { name: /spa.addToBill/ }));
      await tapCard();

      await waitFor(() =>
        expect(mocks.chargeItems).toHaveBeenCalledWith(
          "session-1",
          expect.objectContaining({
            guestCardId: "card-1",
            paymentMethodId: "card-method",
            items: [{ variantId: "variant-scrub", quantity: 2 }],
          })
        )
      );
      expect(mocks.addOrderLine).not.toHaveBeenCalled();
      expect(await screen.findByText("spa.charged")).toBeInTheDocument();
    });

    it("takes cash for the tray instead of a card", async () => {
      await openRunningRoom();
      fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
      fireEvent.click(await screen.findByRole("button", { name: "spa.increaseNew" }));
      fireEvent.click(screen.getByRole("button", { name: /spa.addToBill/ }));
      fireEvent.click(await screen.findByRole("button", { name: "Cash" }));

      await waitFor(() =>
        expect(mocks.chargeItems).toHaveBeenCalledWith(
          "session-1",
          expect.objectContaining({
            paymentMethodId: "cash-method",
            items: [{ variantId: "variant-scrub", quantity: 2 }],
          })
        )
      );
      const [[, payload]] = mocks.chargeItems.mock.calls as [[string, Record<string, unknown>]];
      expect(payload).not.toHaveProperty("guestCardId");
      expect(await screen.findByText("spa.paidWith")).toBeInTheDocument();
    });

    it("adds more sauna time to a running treatment from the room's charges", async () => {
      placeChargesState = [
        {
          variantId: "variant-sauna",
          productId: "product-sauna",
          name: "Sauna",
          unitPrice: 8000,
          blockMinutes: 60,
          minimumUnits: 1,
          soldBy: "TIME",
          chargeMode: "PAY_FIRST",
          autoApply: false,
        },
        {
          variantId: "variant-steam",
          productId: "product-steam",
          name: "Steam room",
          unitPrice: 5000,
          blockMinutes: 30,
          minimumUnits: 1,
          soldBy: "TIME",
          chargeMode: "CLOCK",
          autoApply: false,
        },
      ];
      await openRunningRoom();

      // A clock starts with the treatment, so only the sauna can be added now.
      expect(screen.queryByRole("button", { name: /Steam room/ })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Sauna/ }));
      fireEvent.click(await screen.findByRole("button", { name: /spa.addToBill/ }));
      await tapCard();

      await waitFor(() =>
        expect(mocks.chargeItems).toHaveBeenCalledWith(
          "session-1",
          expect.objectContaining({ items: [{ variantId: "variant-sauna", quantity: 1 }] })
        )
      );
    });

    it("shows the promotion running now and the discounted total before the tap", async () => {
      promotionState = {
        running: [
          { id: "promo-1", name: "Scrub week", discountType: "PERCENT_OFF", discountValue: 10 },
        ],
        discounts: { "variant-scrub": { discount: 1200, names: ["Scrub week"] } },
        promotionName: (id) => (id === "promo-1" ? "Scrub week" : undefined),
      };
      await openRunningRoom();
      expect(screen.getByText("spa.promotionsNow")).toBeInTheDocument();
      expect(screen.getByText(/Scrub week \(10%\)/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Foot Scrub/ }));
      fireEvent.click(await screen.findByRole("button", { name: "spa.increaseNew" }));
      expect(screen.getByText("spa.promoSaving")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /spa.addToBill/ }));

      expect(await screen.findByText("spa.promotionDiscount")).toBeInTheDocument();
      expect(screen.getByText("−1,200")).toBeInTheDocument();
      // The cart row and the tap dialog both show the price after the promotion.
      expect(screen.getAllByText("10,800")).toHaveLength(2);
    });

    it("marks a bill line a promotion discounted", async () => {
      promotionState = {
        running: [],
        discounts: {},
        promotionName: (id) => (id === "promo-1" ? "Scrub week" : undefined),
      };
      lines = [
        {
          id: "line-1",
          salesOrderId: "order-1",
          variantId: "variant-scrub",
          quantity: "1.0000",
          unitPrice: "6000.0000",
          lineDiscount: "600.0000",
          appliedPromotionId: "promo-1",
          productName: "Foot Scrub",
        },
      ];
      await openRunningRoom();

      expect(screen.getByText("spa.promo")).toBeInTheDocument();
      expect(screen.getByText(/Scrub week/)).toBeInTheDocument();
    });

    it("extends by adding a service package with a tap", async () => {
      await openRunningRoom();
      fireEvent.click(screen.getByRole("button", { name: "spa.extend" }));
      expect(screen.getByRole("button", { name: "spa.extendAndPay" })).toBeDisabled();
      const [, moreFoot] = screen.getAllByRole("button", { name: "spa.moreOf" });
      fireEvent.click(moreFoot);
      fireEvent.click(screen.getByRole("button", { name: "spa.extendAndPay" }));
      await tapCard();

      await waitFor(() =>
        expect(mocks.extendSession).toHaveBeenCalledWith(
          "session-1",
          expect.objectContaining({
            packages: [{ packageId: "pkg-foot", quantity: 1 }],
            guestCardId: "card-1",
          })
        )
      );
    });

    it("refunds a wrong item to the card without asking for it", async () => {
      lines = [
        {
          id: "line-1",
          salesOrderId: "order-1",
          variantId: "variant-scrub",
          productName: "Foot Scrub",
          quantity: "1.0000",
          unitPrice: "6000.0000",
          lineDiscount: "900.0000",
          status: "PENDING",
        },
      ];
      await openRunningRoom();
      fireEvent.click(screen.getByRole("button", { name: "spa.refundLine" }));

      await waitFor(() =>
        expect(mocks.refundLine).toHaveBeenCalledWith("session-1", "line-1")
      );
      expect(mocks.lookupCard).not.toHaveBeenCalled();
    });

    it("ends the treatment without taking another payment", async () => {
      await openRunningRoom();
      fireEvent.click(screen.getByRole("button", { name: "spa.endTreatment" }));
      const dialog = await screen.findByText("spa.endTitle");
      expect(dialog).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole("button", { name: "spa.endTreatment" }).at(-1)!);

      await waitFor(() => expect(mocks.closeSession).toHaveBeenCalledWith("session-1", {}));
      expect(mocks.settleOrder).not.toHaveBeenCalled();
      expect(mocks.lookupCard).not.toHaveBeenCalled();
    });
  });
});
