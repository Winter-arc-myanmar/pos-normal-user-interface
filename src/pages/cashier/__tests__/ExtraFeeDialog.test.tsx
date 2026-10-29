import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ExtraFee } from "@/core/domain/entities/ExtraFee";
import { ExtraFeeDialog } from "../ExtraFeeDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const fee = (overrides: Partial<ExtraFee>): ExtraFee => ({
  id: "box",
  name: "Plastic container",
  amount: 300,
  variantId: "box-v",
  isActive: true,
  isOther: false,
  ...overrides,
});

const fees = [
  fee({}),
  fee({ id: "off", name: "Old fee", variantId: "off-v", isActive: false }),
  fee({ id: "other", name: "Other", amount: 0, variantId: "other-v", isOther: true }),
];

describe("ExtraFeeDialog", () => {
  it("adds a listed fee at a changed amount and quantity", async () => {
    const onConfirm = vi.fn();
    render(<ExtraFeeDialog fees={fees} onConfirm={onConfirm} onClose={vi.fn()} />);

    expect(screen.queryByText("Old fee")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Plastic container/ }));
    const amount = screen.getByRole("spinbutton");
    expect(amount).toHaveValue(300);
    await userEvent.clear(amount);
    await userEvent.type(amount, "500");
    await userEvent.click(screen.getByLabelText("cashier.orderPanel.increaseQuantity"));
    await userEvent.click(screen.getByRole("button", { name: "cashier.extraFee.add" }));

    expect(onConfirm).toHaveBeenCalledWith({
      variantId: "box-v",
      name: "Plastic container",
      unitPrice: 500,
      quantity: 2,
    });
  });

  it("asks for a name and amount for Other", async () => {
    const onConfirm = vi.fn();
    render(<ExtraFeeDialog fees={fees} onConfirm={onConfirm} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /cashier.extraFee.other/ }));
    await userEvent.click(screen.getByRole("button", { name: "cashier.extraFee.add" }));
    expect(screen.getByText("cashier.extraFee.nameRequired")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("cashier.extraFee.namePlaceholder"), "Paper bag");
    await userEvent.click(screen.getByRole("button", { name: "cashier.extraFee.add" }));
    expect(screen.getByText("cashier.extraFee.amountRequired")).toBeInTheDocument();

    await userEvent.type(screen.getByRole("spinbutton"), "200");
    await userEvent.click(screen.getByRole("button", { name: "cashier.extraFee.add" }));
    expect(onConfirm).toHaveBeenCalledWith({
      variantId: "other-v",
      name: "Paper bag",
      unitPrice: 200,
      quantity: 1,
    });
  });
});
