import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PosActionRail } from "../PosActionRail";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => null,
}));

describe("PosActionRail", () => {
  it("stacks Drawer, Menu, Orders and Pay in order and preserves actions", () => {
    const onMenu = vi.fn();
    const onOrders = vi.fn();
    const onPay = vi.fn();
    const { container } = render(
      <PosActionRail
        drawerLabel="Drawer"
        menuLabel="Menu"
        ordersLabel="Orders"
        payLabel="Pay"
        branchLabel="Branch"
        branches={[]}
        onBranchChange={vi.fn()}
        onMenu={onMenu}
        onOrders={onOrders}
        onPay={onPay}
        activeView="menu"
      />
    );
    const group = container.querySelector(".pos-action-buttons");
    expect(group).toHaveClass("flex", "flex-col");
    expect(Array.from(group!.querySelectorAll("button"), (button) => button.textContent))
      .toEqual(["Drawer", "Menu", "Orders", "Pay"]);
    expect(screen.getByRole("button", { name: "Drawer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Orders" }));
    fireEvent.click(screen.getByRole("button", { name: "Pay" }));
    expect(onMenu).toHaveBeenCalledOnce();
    expect(onOrders).toHaveBeenCalledOnce();
    expect(onPay).toHaveBeenCalledOnce();
  });
});