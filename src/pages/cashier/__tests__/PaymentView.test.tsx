import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import { PaymentView } from "../PaymentView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const methods = [
  new PaymentMethod({ id: "cash", tenantId: "t1", name: "Cash" }),
  new PaymentMethod({
    id: "local-member-card",
    tenantId: "",
    name: "Member Card",
    isLocalFallback: true,
  }),
];

const renderPaymentView = (
  props: Partial<ComponentProps<typeof PaymentView>> = {}
) =>
  render(
    <PaymentView
      methods={methods}
      selectedMethodId="cash"
      paymentAmount="10.5000"
      total="10.5000"
      isSplitMode={false}
      splitTenders={[]}
      onSelectMethod={vi.fn()}
      onPaymentAmountChange={vi.fn()}
      onOpenSplit={vi.fn()}
      onClosePay={vi.fn()}
      onAddTender={vi.fn()}
      onRemoveTender={vi.fn()}
      {...props}
    />
  );

describe("PaymentView", () => {
  it("selects member card and can add a split tender", () => {
    const onSelectMethod = vi.fn();
    const onAddTender = vi.fn();
    const onOpenSplit = vi.fn();

    renderPaymentView({
      isSplitMode: true,
      onSelectMethod,
      onOpenSplit,
      onAddTender,
    });

    fireEvent.click(screen.getByRole("button", { name: /memberCard/i }));
    expect(onSelectMethod).toHaveBeenCalledWith("local-member-card");
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.split" }));
    expect(onOpenSplit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.addTender" }));
    expect(onAddTender).toHaveBeenCalled();
  });

  it("closes the payment panel from the close button", () => {
    const onClosePay = vi.fn();

    renderPaymentView({ onClosePay });

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.payment.closePayTitle" })
    );
    expect(onClosePay).toHaveBeenCalledTimes(1);
  });

  it("opens split from the rail without closing it on a second tap", () => {
    const onOpenSplit = vi.fn();
    const onClosePay = vi.fn();

    const { rerender } = renderPaymentView({
      onOpenSplit,
      onClosePay,
    });

    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.split" }));
    expect(onOpenSplit).toHaveBeenCalledTimes(1);

    rerender(
      <PaymentView
        methods={methods}
        selectedMethodId="cash"
        paymentAmount="10.5000"
        total="10.5000"
        isSplitMode
        splitTenders={[]}
        onSelectMethod={vi.fn()}
        onPaymentAmountChange={vi.fn()}
        onOpenSplit={onOpenSplit}
        onClosePay={onClosePay}
        onAddTender={vi.fn()}
        onRemoveTender={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.split" }));
    expect(onOpenSplit).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.payment.closePayTitle" })
    );
    expect(onClosePay).toHaveBeenCalledTimes(1);
  });

  it("asks before closing payment when split tenders exist", () => {
    const onClosePay = vi.fn();

    renderPaymentView({
      isSplitMode: true,
      paymentAmount: "4.0000",
      splitTenders: [
        {
          id: "t1",
          paymentMethodId: "cash",
          amount: "4.0000",
        },
      ],
      onClosePay,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "cashier.payment.closePayTitle" })
    );
    expect(onClosePay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.keepSplit" }));
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.payment.closePayTitle" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.payment.confirmCloseSplit" })
    );
    expect(onClosePay).toHaveBeenCalledTimes(1);
  });

  it("shows a covered state when split tenders match the bill", () => {
    renderPaymentView({
      isSplitMode: true,
      paymentAmount: "0.0000",
      splitTenders: [
        {
          id: "t1",
          paymentMethodId: "cash",
          amount: "10.5000",
        },
      ],
    });

    expect(screen.getByText("cashier.payment.splitCovered")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "cashier.payment.addTender" })
    ).toBeDisabled();
  });

  it("shows guest card lookup when member card is selected", () => {
    renderPaymentView({
      selectedMethodId: "local-member-card",
      memberCardLookup: {
        cardUid: "MC-001",
        guestName: "Ko Aung",
        walletNumber: "W-000041",
        balance: "88600",
        status: "ACTIVE",
        error: null,
        isLoading: false,
        nfcSupported: false,
        nfcActive: false,
        nfcError: null,
        onEnableNfc: vi.fn(),
        onCardUidChange: vi.fn(),
        onDetect: vi.fn(),
      },
    });

    expect(screen.getByText("cashier.payment.lookupMemberCard")).toBeInTheDocument();
    expect(screen.getByText("Ko Aung")).toBeInTheDocument();
    expect(screen.getByText("W-000041")).toBeInTheDocument();
  });
});
