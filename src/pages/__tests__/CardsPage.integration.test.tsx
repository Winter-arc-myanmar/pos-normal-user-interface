import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardsPage } from "../CardsPage";
import { GuestCard, GuestWallet, GuestWalletLedgerEntry } from "@/core/domain/entities/GuestWallet";

const mocks = vi.hoisted(() => ({
  lookupCard: vi.fn(),
  getWallet: vi.fn(),
  topUpWallet: vi.fn(),
  requireCashierContext: vi.fn(),
  fetchPaymentMethods: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/i18n/formatters", () => ({
  useNumberFormatter: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({
    requireCashierContext: mocks.requireCashierContext,
  }),
}));

vi.mock("@/core/presentation/hooks/useCashier", () => ({
  useCashier: () => ({
    paymentMethods: [{ id: "cash", tenantId: "tenant-1", name: "Cash" }],
    fetchPaymentMethods: mocks.fetchPaymentMethods,
  }),
}));

vi.mock("@/core/infrastructure/di/container", () => ({
  default: {
    resolve: () => ({
      lookupCard: mocks.lookupCard,
      getWallet: mocks.getWallet,
      topUpWallet: mocks.topUpWallet,
    }),
  },
}));

const wallet = new GuestWallet({
  id: "wallet-1",
  guestName: "Test Member",
  guestPhone: "09123456789",
  walletNumber: "W-1",
  balance: "100.0000",
  status: "ACTIVE",
});

describe("CardsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchPaymentMethods.mockResolvedValue(undefined);
    mocks.requireCashierContext.mockResolvedValue({
      tenantId: "tenant-1",
      locationId: "location-1",
      posRegisterId: "register-1",
      posSessionId: "session-1",
    });
    mocks.lookupCard.mockResolvedValue(
      new GuestCard({
        id: "card-1",
        walletId: "wallet-1",
        cardUid: "MC-001",
        status: "ACTIVE",
      })
    );
    mocks.getWallet.mockResolvedValue(wallet);
    mocks.topUpWallet.mockResolvedValue(
      new GuestWalletLedgerEntry({
        id: "entry-1",
        walletId: "wallet-1",
        amount: "10000.0000",
        balanceAfter: "10100.0000",
        createdAt: "2026-01-01T00:00:00.000Z",
      })
    );
    vi.spyOn(window, "print").mockImplementation(() => undefined);
  });

  it("walks through menu, detect, amount, and print steps for top up", async () => {
    render(
      <MemoryRouter>
        <CardsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("cards.menuTopup"));
    expect(screen.getByText("cardTopup.detect")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("cardTopup.cardNumberPlaceholder"), {
      target: { value: "MC-001" },
    });
    fireEvent.click(screen.getByText("cardTopup.detect"));

    await waitFor(() => {
      expect(mocks.lookupCard).toHaveBeenCalledWith("MC-001");
      expect(screen.getByText("MC-001")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("10,000"));
    fireEvent.click(screen.getByText("cardTopup.continueToPrint"));

    expect(screen.getByText("cardTopup.confirmPrint")).toBeInTheDocument();

    fireEvent.click(screen.getByText("cardTopup.confirmPrint"));

    await waitFor(() => {
      expect(mocks.topUpWallet).toHaveBeenCalledWith("wallet-1", {
        amount: "10000.0000",
        paymentMethodId: "cash",
        posSessionId: "session-1",
        locationId: "location-1",
        reference: undefined,
        guestCardId: "card-1",
      });
      expect(window.print).toHaveBeenCalled();
    });
  });

  it("detects a card from a USB reader swipe", async () => {
    render(
      <MemoryRouter>
        <CardsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("cards.menuTopup"));
    for (const key of "MC-001") {
      fireEvent.keyDown(window, { key, bubbles: true });
    }
    fireEvent.keyDown(window, { key: "Enter", bubbles: true });

    await waitFor(() => {
      expect(mocks.lookupCard).toHaveBeenCalledWith("MC-001");
    });
  });
});
