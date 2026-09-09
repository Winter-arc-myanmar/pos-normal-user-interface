import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardRefundPage } from "../CardRefundPage";
import { MembershipCard } from "@/core/domain/entities/MembershipCard";

const mocks = vi.hoisted(() => ({
  detectMembershipCard: vi.fn(),
  verifyMembershipCardPin: vi.fn(),
  getRefundAmountOptions: vi.fn(),
  createRefundReceipt: vi.fn(),
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
      verifyMembershipCardPin: mocks.verifyMembershipCardPin,
      getRefundAmountOptions: mocks.getRefundAmountOptions,
      createRefundReceipt: mocks.createRefundReceipt,
    }),
  },
}));

describe("CardRefundPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRefundAmountOptions.mockResolvedValue([
      { id: "refund-10", label: "10,000", amount: "10000.0000" },
    ]);
    mocks.detectMembershipCard.mockResolvedValue({
      card: new MembershipCard({
        id: "card-1",
        tenantId: "tenant-1",
        customerId: "cust-1",
        cardNumber: "MC-001",
        balance: "50000.0000",
        status: "BOUND",
      }),
      customerName: "Test Member",
      customerPhone: "09123456789",
    });
    mocks.verifyMembershipCardPin.mockResolvedValue({ verified: true });
    mocks.createRefundReceipt.mockResolvedValue({
      receiptId: "rcpt-1",
      cardNumber: "MC-001",
      customerName: "Test Member",
      amount: "10000.0000",
      balanceAfter: "0.0000",
      printedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.spyOn(window, "print").mockImplementation(() => undefined);
  });

  it("walks through menu, detect, pin, amount, and print steps", async () => {
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
      expect(mocks.detectMembershipCard).toHaveBeenCalledWith({
        cardNumber: "MC-001",
      });
      expect(screen.getByPlaceholderText("cardRefund.pinPlaceholder")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("cardRefund.pinPlaceholder"), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByText("cardRefund.verifyPin"));

    await waitFor(() => {
      expect(mocks.verifyMembershipCardPin).toHaveBeenCalledWith({
        cardNumber: "MC-001",
        pin: "1234",
      });
      expect(screen.getByText("10,000")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("10,000"));
    fireEvent.click(screen.getByText("cardRefund.continueToPrint"));
    fireEvent.click(screen.getByText("cardRefund.confirmPrint"));

    await waitFor(() => {
      expect(mocks.createRefundReceipt).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        cardNumber: "MC-001",
        amount: "10000.0000",
        pin: "1234",
      });
      expect(window.print).toHaveBeenCalled();
    });
  });
});
