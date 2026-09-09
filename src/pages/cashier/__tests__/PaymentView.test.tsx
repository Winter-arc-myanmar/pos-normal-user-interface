import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

describe("PaymentView", () => {
  it("selects member card and can add a split tender", () => {
    const onSelectMethod = vi.fn();
    const onAddTender = vi.fn();
    const onOpenSplit = vi.fn();
    const onCloseSplit = vi.fn();

    render(
      <PaymentView
        methods={methods}
        selectedMethodId="cash"
        paymentAmount="10.5000"
        total="10.5000"
        isSplitMode
        splitTenders={[]}
        onSelectMethod={onSelectMethod}
        onPaymentAmountChange={vi.fn()}
        onOpenSplit={onOpenSplit}
        onCloseSplit={onCloseSplit}
        onAddTender={onAddTender}
        onRemoveTender={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /memberCard/i }));
    expect(onSelectMethod).toHaveBeenCalledWith("local-member-card");
    expect(screen.getByText("cashier.payment.chooseMethod")).toBeInTheDocument();
    expect(screen.getByText("cashier.payment.nextMethod")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.split" }));
    expect(onOpenSplit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.addTender" }));
    expect(onAddTender).toHaveBeenCalled();
  });

  it("opens split from the rail without closing it on a second tap", () => {
    const onOpenSplit = vi.fn();
    const onCloseSplit = vi.fn();

    const { rerender } = render(
      <PaymentView
        methods={methods}
        selectedMethodId="cash"
        paymentAmount="10.5000"
        total="10.5000"
        isSplitMode={false}
        splitTenders={[]}
        onSelectMethod={vi.fn()}
        onPaymentAmountChange={vi.fn()}
        onOpenSplit={onOpenSplit}
        onCloseSplit={onCloseSplit}
        onAddTender={vi.fn()}
        onRemoveTender={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.split" }));
    expect(onOpenSplit).toHaveBeenCalledTimes(1);
    expect(onCloseSplit).not.toHaveBeenCalled();

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
        onCloseSplit={onCloseSplit}
        onAddTender={vi.fn()}
        onRemoveTender={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.split" }));
    expect(onOpenSplit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.closeSplit" }));
    expect(onCloseSplit).toHaveBeenCalledTimes(1);
  });

  it("asks before closing split when tenders exist", () => {
    const onCloseSplit = vi.fn();

    render(
      <PaymentView
        methods={methods}
        selectedMethodId="cash"
        paymentAmount="4.0000"
        total="10.5000"
        isSplitMode
        splitTenders={[
          {
            id: "t1",
            paymentMethodId: "cash",
            amount: "4.0000",
          },
        ]}
        onSelectMethod={vi.fn()}
        onPaymentAmountChange={vi.fn()}
        onOpenSplit={vi.fn()}
        onCloseSplit={onCloseSplit}
        onAddTender={vi.fn()}
        onRemoveTender={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.closeSplit" }));
    expect(onCloseSplit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.keepSplit" }));
    expect(onCloseSplit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.closeSplit" }));
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.payment.confirmCloseSplit" })
    );
    expect(onCloseSplit).toHaveBeenCalledTimes(1);
  });

  it("shows a covered state when split tenders match the bill", () => {
    render(
      <PaymentView
        methods={methods}
        selectedMethodId="cash"
        paymentAmount="0.0000"
        total="10.5000"
        isSplitMode
        splitTenders={[
          {
            id: "t1",
            paymentMethodId: "cash",
            amount: "10.5000",
          },
        ]}
        onSelectMethod={vi.fn()}
        onPaymentAmountChange={vi.fn()}
        onOpenSplit={vi.fn()}
        onCloseSplit={vi.fn()}
        onAddTender={vi.fn()}
        onRemoveTender={vi.fn()}
      />
    );

    expect(screen.getByText("cashier.payment.splitCovered")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "cashier.payment.addTender" })
    ).toBeDisabled();
  });
});
