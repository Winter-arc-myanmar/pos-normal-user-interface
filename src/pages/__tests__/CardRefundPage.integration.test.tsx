import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardRefundPage } from "../CardRefundPage";
import { GuestCard, GuestWallet } from "@/core/domain/entities/GuestWallet";

const mocks = vi.hoisted(() => ({
  lookupCard: vi.fn(),
  getWallet: vi.fn(),
  refundWallet: vi.fn(),
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
      refundWallet: mocks.refundWallet,
    }),
  },
}));

const wallet = new GuestWallet({
  id: "wallet-1",
  guestName: "Test Member",
  guestPhone: "09123456789",
  walletNumber: "W-1",
  balance: "50000.0000",
  purchasedBalance: "50000.0000",
  status: "ACTIVE",
});

describe("CardRefundPage", () => {
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
    mocks.refundWallet.mockResolvedValue(
      new GuestWallet({
        ...wallet,
        balance: "40000.0000",
        purchasedBalance: "40000.0000",
      })
    );
    vi.spyOn(window, "print").mockImplementation(() => undefined);
  });

  it("walks through detect, amount, and print steps", async () => {
    render(
      <MemoryRouter>
        <CardRefundPage />
      </MemoryRouter>
    );

    expect(screen.getByText("cardRefund.detect")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("cardRefund.cardNumberPlaceholder"), {
      target: { value: "MC-001" },
    });
    fireEvent.click(screen.getByText("cardRefund.detect"));

    await waitFor(() => {
      expect(mocks.lookupCard).toHaveBeenCalledWith("MC-001");
      expect(screen.getByText("10,000")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("10,000"));
    fireEvent.click(screen.getByText("cardRefund.continueToPrint"));
    fireEvent.change(screen.getByPlaceholderText("crm.approverToken"), {
      target: { value: "approver-token" },
    });
    fireEvent.click(screen.getByText("cardRefund.confirmPrint"));

    await waitFor(() => {
      expect(mocks.refundWallet).toHaveBeenCalledWith("wallet-1", {
        amount: "10000.0000",
        paymentMethodId: "cash",
        posSessionId: "session-1",
        locationId: "location-1",
        reference: undefined,
        notes: undefined,
        approverAuthorization: "approver-token",
      });
      expect(window.print).toHaveBeenCalled();
    });
  });
});
