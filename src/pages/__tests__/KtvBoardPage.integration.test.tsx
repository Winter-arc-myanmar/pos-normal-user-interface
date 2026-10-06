import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/Toaster";
import { KtvBoardPage } from "../KtvBoardPage";

const promotionState: {
  running: Record<string, unknown>[];
  discounts: Record<string, { discount: number; names: string[] }>;
  promotionName: (id: string | undefined) => string | undefined;
} = { running: [], discounts: {}, promotionName: () => undefined };

let rentalsState: {
  variantId: string;
  productId: string;
  name: string;
  unitPrice: number;
  blockMinutes: number;
  minimumUnits: number;
}[] = [];

const spaPackages: {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  variantId: string;
  items: { name: string; quantity: number }[];
}[] = [];

let venueState: {
  paymentTiming: "PAY_WHEN_ORDERING" | "PAY_AT_END";
  roomCardOnly: boolean;
  spaMenuOrdering?: boolean;
  ktvMenuOrdering?: boolean;
} = {
  paymentTiming: "PAY_WHEN_ORDERING",
  roomCardOnly: true,
};

const mocks = vi.hoisted(() => ({
  fetchBoard: vi.fn(),
  getQuote: vi.fn(),
  openSession: vi.fn(),
  extendSession: vi.fn(),
  chargeItems: vi.fn(),
  closeSession: vi.fn(),
  updateRoom: vi.fn(),
  fetchOrderLines: vi.fn(),
  lookupCard: vi.fn(),
  getWallet: vi.fn(),
  requireCashierContext: vi.fn(),
  printReceipt: vi.fn(),
  loadHostesses: vi.fn(),
  noop: vi.fn(),
}));

const wallet = {
  id: "wallet-1",
  tenantId: "tenant-1",
  guestName: "Ko Aung",
  tierNameSnapshot: "Gold",
  discountBpsSnapshot: 0,
  balance: "200000.0000",
  status: "ACTIVE",
};
const card = { id: "card-1", cardUid: "04A3B2C1", walletId: "wallet-1", wallet };

const freeRoom = {
  id: "ktv-1",
  tenantId: "tenant-1",
  locationId: "location-1",
  roomNumber: "K1",
  name: "Gold Room",
  capacity: 8,
  rateVariantId: "variant-ktv",
  rateProductId: "product-ktv",
  sessionPrice: 30000,
  priceNow: 35000,
  rateLabel: "Peak",
  minimumMinutes: 60,
  incrementMinutes: 30,
  graceMinutes: 5,
  roundingMode: "UP",
  status: "AVAILABLE",
  sessions: [] as Record<string, unknown>[],
};
const busyRoom = {
  ...freeRoom,
  status: "OCCUPIED",
  sessions: [
    {
      id: "ktv-session-1",
      roomId: "ktv-1",
      guestWalletId: "wallet-1",
      salesOrderId: "order-1",
      guestCount: 4,
      openedAt: "2026-09-26T12:00:00Z",
      sessionState: "OPEN",
      plannedMinutes: 120,
    },
  ],
};
const paidQuote = {
  sessionId: "ktv-session-1",
  roomId: "ktv-1",
  roomNumber: "K1",
  state: "OPEN",
  openedAt: "2026-09-26T12:00:00Z",
  asOf: "2026-09-26T13:00:00Z",
  elapsedMinutes: 60,
  pausedMinutes: 0,
  segments: [],
  roomCharge: "70000.0000",
  fnbCharge: "0.0000",
  runningTotal: "70000.0000",
  prepaid: true,
  paidTotal: "70000.0000",
};

let rooms: Record<string, unknown>[] = [freeRoom];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      exists: (key: string) => key.startsWith("ktvPos."),
    },
  }),
}));
vi.mock("@/components/LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));
vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", tenantId: "tenant-1", name: "Cashier" } }),
}));
vi.mock("@/core/presentation/hooks/usePrinterConnection", () => ({
  usePrinterConnection: () => ({
    printReceipt: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock("@/core/presentation/hooks/useSpaManagement", () => ({
  useSpaManagement: () => ({ rooms: [], quote: null }),
}));
vi.mock("@/core/presentation/hooks/useVenueSetting", () => ({
  useVenueSetting: () => ({ spaMenuOrdering: true, ktvMenuOrdering: true, ...venueState }),
}));

vi.mock("@/core/presentation/hooks/useSpaPackages", () => ({
  useSpaPackages: () => ({ packages: spaPackages, error: null }),
}));

vi.mock("@/core/presentation/hooks/useRoomPromotions", () => ({
  useRoomPromotions: () => promotionState,
}));

vi.mock("@/core/presentation/hooks/useKtvManagement", () => ({
  useKtvManagement: () => ({
    rooms,
    quote: paidQuote,
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
    extendSession: mocks.extendSession,
    chargeItems: mocks.chargeItems,
    giveFree: mocks.noop,
    refundLine: mocks.noop,
    clearQuote: mocks.noop,
  }),
}));
vi.mock("@/core/presentation/hooks/usePlaceCharges", () => ({
  usePlaceCharges: () => rentalsState,
}));
vi.mock("@/core/presentation/hooks/useWorkingHostesses", () => ({
  useWorkingHostesses: () => ({
    hostesses: [
      { id: "hostess-snow", name: "Ma Hnin", nickname: "Snow", inRoom: null },
      { id: "hostess-rose", name: "Ma Thiri", nickname: "Rose", inRoom: { roomNumber: "K3", until: null } },
    ],
    isLoading: false,
    error: null,
    load: mocks.loadHostesses,
  }),
}));
vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    products: [
      { id: "product-beer", name: "Myanmar Beer", categoryName: "Beer", basePrice: "4000.0000" },
      { id: "product-ktv", name: "KTV room K1", categoryName: "KTV Rooms", basePrice: "30000.0000" },
      {
        id: "product-hostess",
        name: "Hostess per hour",
        categoryName: "Hostess",
        basePrice: "20000.0000",
        kind: "SERVICE",
        soldAt: ["KTV"],
        askWhoServed: true,
      },
      { id: "product-tea", name: "Herbal tea", categoryName: "Spa drinks", basePrice: "2000.0000", soldAt: ["SPA"] },
    ],
    variantsByProductId: {
      "product-beer": [{ id: "variant-beer", productId: "product-beer", priceModifier: "0" }],
      "product-hostess": [{ id: "variant-hostess", productId: "product-hostess", priceModifier: "0" }],
    },
    paymentMethods: [
      { id: "card-method", tenantId: "tenant-1", name: "Guest Card", kind: "GUEST_CARD" },
    ],
    discountReasons: [],
    fetchDiscountReasons: () => Promise.resolve(),
    fetchProducts: mocks.noop,
    fetchProductVariants: mocks.noop,
    fetchPaymentMethods: mocks.noop,
  }),
}));
vi.mock("@/core/presentation/hooks/useSalesOrderManagement", () => ({
  useSalesOrderManagement: () => ({
    orderLines: [],
    fetchOrderLines: mocks.fetchOrderLines,
    addOrderLine: mocks.noop,
    updateOrderLine: mocks.noop,
    deleteOrderLine: mocks.noop,
    settleOrder: mocks.noop,
  }),
}));
vi.mock("@/core/presentation/hooks/useGuestWalletManagement", () => ({
  useGuestWalletManagement: () => ({ lookupCard: mocks.lookupCard, getWallet: mocks.getWallet }),
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
    <MemoryRouter initialEntries={["/ktv"]}>
      <KtvBoardPage />
      <Toaster />
    </MemoryRouter>
  );

const tapCard = async () => {
  fireEvent.change(await screen.findByPlaceholderText("ktvPos.cardUid"), {
    target: { value: "04A3B2C1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "ktvPos.checkCard" }));
};

describe("KtvBoardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    venueState = { paymentTiming: "PAY_WHEN_ORDERING", roomCardOnly: true };
    rooms = [freeRoom];
    rentalsState = [];
    promotionState.running = [];
    mocks.fetchBoard.mockResolvedValue(rooms);
    mocks.getQuote.mockResolvedValue(paidQuote);
    mocks.fetchOrderLines.mockResolvedValue({ lines: [] });
    mocks.lookupCard.mockResolvedValue(card);
    mocks.getWallet.mockResolvedValue(wallet);
    mocks.requireCashierContext.mockResolvedValue({
      tenantId: "tenant-1",
      locationId: "location-1",
      posRegisterId: "register-1",
      posSessionId: "pos-session-1",
    });
    mocks.printReceipt.mockResolvedValue(undefined);
  });

  it("shows each room with the hourly price that applies now", () => {
    renderPage();
    expect(screen.getByText("ktvPos.boardTitle")).toBeInTheDocument();
    expect(screen.getByText("35,000")).toBeInTheDocument();
  });

  it("starts a room for the chosen hours after one card tap", async () => {
    mocks.openSession.mockResolvedValue({
      id: "ktv-session-1",
      roomId: "ktv-1",
      salesOrderId: "order-1",
      guestWalletId: "wallet-1",
      guestCount: 1,
      openedAt: "2026-09-26T12:00:00Z",
      sessionState: "OPEN",
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /K1/ }));
    fireEvent.click(screen.getByRole("button", { name: "ktvPos.moreSessions" }));
    fireEvent.click(screen.getByRole("button", { name: "ktvPos.startAndPay" }));
    await tapCard();

    await waitFor(() =>
      expect(mocks.openSession).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: "ktv-1",
          guestWalletId: "wallet-1",
          hours: 2,
          prepay: expect.objectContaining({
            guestCardId: "card-1",
            paymentMethodId: "card-method",
          }),
        })
      )
    );
    expect(mocks.openSession.mock.calls[0][0]).not.toHaveProperty("sessions");
  });

  it("starts a room for the chosen hours on the bill when the business takes payment at the end", async () => {
    venueState = { paymentTiming: "PAY_AT_END", roomCardOnly: true };
    mocks.openSession.mockResolvedValue({
      id: "ktv-session-1",
      roomId: "ktv-1",
      salesOrderId: "order-1",
      guestCount: 1,
      openedAt: "2026-09-26T12:00:00Z",
      sessionState: "OPEN",
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /K1/ }));
    fireEvent.click(screen.getByRole("button", { name: "ktvPos.moreSessions" }));
    fireEvent.click(screen.getByRole("button", { name: "ktvPos.startOnBill" }));

    await waitFor(() =>
      expect(mocks.openSession).toHaveBeenCalledWith(
        expect.objectContaining({ roomId: "ktv-1", hours: 2 })
      )
    );
    expect(mocks.openSession.mock.calls[0][0].prepay).toBeUndefined();
    expect(screen.queryByPlaceholderText("ktvPos.cardUid")).not.toBeInTheDocument();
  });

  it("sells more time by the hour with a tap", async () => {
    rooms = [busyRoom];
    mocks.extendSession.mockResolvedValue({
      charged: "35000.0000",
      balanceAfter: "165000.0000",
      quote: paidQuote,
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /K1/ }));
    fireEvent.click(await screen.findByRole("button", { name: "ktvPos.extend" }));
    fireEvent.click(screen.getByRole("button", { name: "ktvPos.extendAndPay" }));
    await tapCard();

    await waitFor(() =>
      expect(mocks.extendSession).toHaveBeenCalledWith(
        "ktv-session-1",
        expect.objectContaining({ hours: 1, guestCardId: "card-1" })
      )
    );
  });

  it("keeps the room's own price product off the menu", async () => {
    rooms = [busyRoom];
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /K1/ }));

    expect(await screen.findByRole("button", { name: /Myanmar Beer/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /KTV room K1/ })).not.toBeInTheDocument();
  });

  describe("rentals, free time and hostesses", () => {
    const ownRate = {
      variantId: "variant-ktv",
      productId: "product-ktv",
      name: "KTV room K1",
      unitPrice: 30000,
      blockMinutes: 60,
      minimumUnits: 1,
    };
    const vip = {
      variantId: "variant-vip",
      productId: "product-vip",
      name: "VIP hourly",
      unitPrice: 50000,
      blockMinutes: 60,
      minimumUnits: 2,
    };
    const started = {
      id: "ktv-session-1",
      roomId: "ktv-1",
      salesOrderId: "order-1",
      guestWalletId: "wallet-1",
      guestCount: 1,
      openedAt: "2026-09-26T12:00:00Z",
      sessionState: "OPEN",
    };

    it("starts a room on another rental the cashier picks, at its minimum", async () => {
      rentalsState = [ownRate, vip];
      mocks.openSession.mockResolvedValue(started);
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /K1/ }));
      fireEvent.click(screen.getByRole("button", { name: /VIP hourly/ }));
      fireEvent.click(screen.getByRole("button", { name: "ktvPos.startAndPay" }));
      await tapCard();

      await waitFor(() =>
        expect(mocks.openSession).toHaveBeenCalledWith(
          expect.objectContaining({ rentalVariantId: "variant-vip", hours: 2 })
        )
      );
    });

    it("does not offer a choice when the room has one rental", () => {
      rentalsState = [ownRate];
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /K1/ }));

      expect(screen.queryByText("ktvPos.chooseRental")).not.toBeInTheDocument();
    });

    it("shows the free hours a running promotion adds", () => {
      rentalsState = [ownRate];
      promotionState.running = [
        {
          id: "b1g1",
          name: "1 hour + 1 free",
          discountType: "FREE_TIME",
          discountValue: 0,
          buyUnits: 1,
          freeUnits: 1,
          appliesTo: "ITEMS",
          variantIds: ["variant-ktv"],
          priorityLevel: 0,
        },
      ];
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /K1/ }));

      expect(screen.getByText("ktvPos.freeTimeAdded")).toBeInTheDocument();
    });

    it("asks which hostess gives a hostess service and sends her with it", async () => {
      rooms = [busyRoom];
      mocks.chargeItems.mockResolvedValue({
        charged: "20000.0000",
        balanceAfter: "180000.0000",
        quote: paidQuote,
      });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /K1/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Hostess per hour/ }));

      expect(await screen.findByText("ktvPos.whoServes")).toBeInTheDocument();
      expect(screen.getByText("ktvPos.hostessInRoom")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Snow/ }));
      fireEvent.click(await screen.findByRole("button", { name: /ktvPos.addToBill/ }));
      await tapCard();

      await waitFor(() =>
        expect(mocks.chargeItems).toHaveBeenCalledWith(
          "ktv-session-1",
          expect.objectContaining({
            items: [{ variantId: "variant-hostess", quantity: 1, hostessId: "hostess-snow" }],
          })
        )
      );
    });

    it("keeps products sold only at the SPA off the KTV menu", async () => {
      rooms = [busyRoom];
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /K1/ }));

      expect(await screen.findByRole("button", { name: /Myanmar Beer/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Herbal tea/ })).not.toBeInTheDocument();
    });
  });
});
