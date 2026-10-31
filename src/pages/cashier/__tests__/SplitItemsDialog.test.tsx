import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DiningTable,
  SalesOrderLine,
  TableSession,
} from "@/core/domain/entities/Cashier";
import { SplitItemsDialog } from "../SplitItemsDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const tables = [
  new DiningTable({ id: "t1", tableNumber: "T1", status: "OCCUPIED" }),
  new DiningTable({ id: "t2", tableNumber: "T2", status: "OCCUPIED" }),
  new DiningTable({ id: "t3", tableNumber: "T3", status: "AVAILABLE" }),
];
const own = new TableSession({
  id: "s1",
  tableId: "t1",
  salesOrderId: "o1",
  sessionState: "ORDERING",
});
const other = new TableSession({
  id: "s2",
  tableId: "t2",
  salesOrderId: "o2",
  sessionState: "ORDERING",
});
const lines = [
  new SalesOrderLine({
    id: "beer",
    salesOrderId: "o1",
    variantId: "v1",
    quantity: "4.0000",
    unitPrice: "3000",
    productName: "Beer",
  }),
  new SalesOrderLine({
    id: "rice",
    salesOrderId: "o1",
    variantId: "v2",
    quantity: "1.0000",
    unitPrice: "5000",
    productName: "Fried rice",
  }),
  new SalesOrderLine({
    id: "gone",
    salesOrderId: "o1",
    variantId: "v3",
    quantity: "1.0000",
    unitPrice: "1000",
    productName: "Voided soup",
    status: "VOIDED",
  }),
];

const renderDialog = (onConfirm = vi.fn()) => {
  render(
    <SplitItemsDialog
      session={own}
      lines={lines}
      tables={tables}
      sessions={[own, other]}
      onConfirm={onConfirm}
      onClose={vi.fn()}
    />
  );
  return onConfirm;
};

describe("SplitItemsDialog", () => {
  it("moves part of one line and all of another to an open bill", () => {
    const onConfirm = renderDialog();
    const [beerUp] = screen.getAllByRole("button", {
      name: "cashier.orderPanel.increaseQuantity",
    });
    fireEvent.click(beerUp);
    fireEvent.click(screen.getAllByRole("button", { name: "cashier.seating.all" })[1]);
    fireEvent.click(screen.getByRole("button", { name: /T2/ }));
    fireEvent.click(screen.getByRole("button", { name: "cashier.seating.moveItems" }));

    expect(onConfirm).toHaveBeenCalledWith({ sessionId: "s2" }, [
      { lineId: "beer", quantity: 1 },
      { lineId: "rice", quantity: 1 },
    ]);
  });

  it("offers free tables and hides voided lines", () => {
    const onConfirm = renderDialog();
    expect(screen.queryByText("Voided soup")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "cashier.seating.all" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /T3/ }));
    fireEvent.click(screen.getByRole("button", { name: "cashier.seating.moveItems" }));

    expect(onConfirm).toHaveBeenCalledWith({ tableId: "t3" }, [
      { lineId: "beer", quantity: 4 },
    ]);
  });

  it("waits for items and a table before moving", () => {
    renderDialog();
    const move = screen.getByRole("button", { name: "cashier.seating.moveItems" });
    expect(move).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /T2/ }));
    expect(move).toBeDisabled();
  });

  it("names a line saved without a name from the menu", () => {
    render(
      <SplitItemsDialog
        session={own}
        lines={[
          ...lines,
          new SalesOrderLine({ id: "noodles", salesOrderId: "o1", variantId: "v4", quantity: "1.0000", unitPrice: "13000" }),
        ]}
        tables={tables}
        sessions={[own, other]}
        menuName={(line) => (line.variantId === "v4" ? "Fried noodles" : undefined)}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Fried noodles")).toBeInTheDocument();
    expect(screen.queryByText("?")).not.toBeInTheDocument();
  });
});
