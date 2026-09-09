import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import { PaymentView } from "../PaymentView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("PaymentView", () => {
  const methods = [
    new PaymentMethod({ id: "cash", tenantId: "t1", name: "Cash" }),
    new PaymentMethod({
      id: "local-member-card",
      tenantId: "",
      name: "Member Card",
      isLocalFallback: true,
    }),
  ];

  it("selects member card and can add a split tender", () => {
    const onSelectMethod = vi.fn();
    const onAddTender = vi.fn();
    const onToggleSplit = vi.fn();

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
        onToggleSplit={onToggleSplit}
        onAddTender={onAddTender}
        onRemoveTender={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /memberCard/i }));
    expect(onSelectMethod).toHaveBeenCalledWith("local-member-card");
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.split" }));
    expect(onToggleSplit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "cashier.payment.addTender" }));
    expect(onAddTender).toHaveBeenCalled();
  });
});
