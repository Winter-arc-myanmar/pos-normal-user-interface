import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Product, ProductVariant } from "@/core/domain/entities/Cashier";
import { ProductMenu } from "../ProductMenu";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const coffee = new Product({
  id: "product-1",
  tenantId: "t1",
  name: "Coffee",
  basePrice: "10.0000",
  baseSku: "COFFEE",
  imageUrl: "https://cdn.example.com/coffee.jpg",
});

const soup = new Product({
  id: "product-2",
  tenantId: "t1",
  name: "Deli Soup",
  basePrice: "8.0000",
  baseSku: "SOUP",
});

const coffeeVariant = new ProductVariant({
  id: "variant-1",
  productId: "product-1",
  variantSku: "COFFEE",
});

const soupSmall = new ProductVariant({
  id: "variant-s",
  productId: "product-2",
  variantSku: "SOUP-S",
});

const soupLarge = new ProductVariant({
  id: "variant-l",
  productId: "product-2",
  variantSku: "SOUP-L",
});

describe("ProductMenu", () => {
  it("adds a single-variant product to the order on one click", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onLoadVariants = vi.fn().mockResolvedValue([coffeeVariant]);

    render(
      <ProductMenu
        products={[coffee]}
        variantsByProductId={{ "product-1": [coffeeVariant] }}
        onLoadVariants={onLoadVariants}
        onAdd={onAdd}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Coffee/ }));

    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(coffee, "variant-1", 1)
    );
    expect(
      screen.queryByRole("button", { name: "cashier.productMenu.add" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the product image and hides the SKU on menu cards", () => {
    render(
      <ProductMenu
        products={[coffee]}
        variantsByProductId={{ "product-1": [coffeeVariant] }}
        onLoadVariants={vi.fn()}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const image = document.querySelector("img");
    expect(image).toHaveAttribute("src", "https://cdn.example.com/coffee.jpg");
    expect(screen.queryByText("COFFEE")).not.toBeInTheDocument();
    expect(screen.queryByText("cashier.productMenu.noSku")).not.toBeInTheDocument();
  });

  it("opens a variant modal only when a product has multiple variants", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onLoadVariants = vi.fn().mockResolvedValue([soupSmall, soupLarge]);

    render(
      <ProductMenu
        products={[soup]}
        variantsByProductId={{ "product-2": [soupSmall, soupLarge] }}
        onLoadVariants={onLoadVariants}
        onAdd={onAdd}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Deli Soup/ }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("cashier.productMenu.chooseVariant")).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "SOUP-L" }));
    fireEvent.click(
      screen.getByRole("button", { name: "cashier.productMenu.add" })
    );

    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(soup, "variant-l", 1)
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks ordered products as selected in the menu grid", () => {
    render(
      <ProductMenu
        products={[coffee, soup]}
        variantsByProductId={{
          "product-1": [coffeeVariant],
          "product-2": [soupSmall, soupLarge],
        }}
        orderedProductQuantities={{ "product-1": 2 }}
        onLoadVariants={vi.fn()}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /Coffee/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Deli Soup/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});
