import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardsPage } from "../CardsPage";
import { MembershipCard } from "@/core/domain/entities/MembershipCard";

const mocks = vi.hoisted(() => ({
  detectMembershipCard: vi.fn(),
  getTopupAmountOptions: vi.fn(),
  createTopupReceipt: vi.fn(),
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

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", tenantId: "tenant-1" },
  }),
}));

vi.mock("@/core/infrastructure/di/container", () => ({
  default: {
    resolve: () => ({
      detectMembershipCard: mocks.detectMembershipCard,
      getTopupAmountOptions: mocks.getTopupAmountOptions,
      createTopupReceipt: mocks.createTopupReceipt,
    }),
  },
}));

describe("CardsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTopupAmountOptions.mockResolvedValue([
      { id: "topup-10", label: "10,000", amount: "10000.0000" },
    ]);
    mocks.detectMembershipCard.mockResolvedValue({
      card: new MembershipCard({
        id: "card-1",
        tenantId: "tenant-1",
        customerId: "cust-1",
        cardNumber: "MC-001",
        balance: "100.0000",
        status: "BOUND",
      }),
      customerName: "Test Member",
      customerPhone: "09123456789",
    });
    mocks.createTopupReceipt.mockResolvedValue({
      receiptId: "rcpt-1",
      cardNumber: "MC-001",
      customerName: "Test Member",
      amount: "10000.0000",
      balanceAfter: "10100.0000",
      printedAt: "2026-01-01T00:00:00.000Z",
    });
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
      expect(mocks.detectMembershipCard).toHaveBeenCalledWith({
        cardNumber: "MC-001",
      });
      expect(screen.getByText("MC-001")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("10,000"));
    fireEvent.click(screen.getByText("cardTopup.continueToPrint"));

    expect(screen.getByText("cardTopup.confirmPrint")).toBeInTheDocument();

    fireEvent.click(screen.getByText("cardTopup.confirmPrint"));

    await waitFor(() => {
      expect(mocks.createTopupReceipt).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        cardNumber: "MC-001",
        amount: "10000.0000",
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
      expect(mocks.detectMembershipCard).toHaveBeenCalledWith({
        cardNumber: "MC-001",
      });
    });
  });
});
