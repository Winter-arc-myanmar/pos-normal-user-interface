import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../ui/DataTable";
import { SearchInput } from "../ui/SearchInput";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("shared responsive sizing contracts", () => {
  it("contains table width without losing columns or row actions", () => {
    const onRowClick = vi.fn();
    const row = { id: "1", name: "A long product name", amount: "1000000.00" };
    render(
      <DataTable
        columns={[
          { key: "name", header: "Product" },
          { key: "amount", header: "Amount" },
        ]}
        data={[row]}
        keyExtractor={(item) => item.id}
        onRowClick={onRowClick}
      />
    );

    const table = screen.getByRole("table");
    expect(table).toHaveClass("pos-data-table");
    expect(table.parentElement).toHaveClass("min-w-0", "max-w-full", "overflow-x-auto");
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    fireEvent.click(screen.getByText(row.name));
    expect(onRowClick).toHaveBeenCalledWith(row);
  });

  it("lets both the search wrapper and input shrink inside narrow flex rows", () => {
    const onChange = vi.fn();
    render(<SearchInput aria-label="Search products" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Search products" });

    expect(input).toHaveClass("min-w-0", "w-full");
    expect(input.parentElement).toHaveClass("min-w-0", "max-w-full");
    fireEvent.change(input, { target: { value: "coffee" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(input).toHaveValue("coffee");
  });
});