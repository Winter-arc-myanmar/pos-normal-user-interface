import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Product } from "@/core/domain/entities/Cashier";
import { ProductsPage } from "../ProductsPage";

const mocks = vi.hoisted(() => ({ trackStock: true }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/i18n/formatters", () => ({
  useNumberFormatter: () => ({ formatNumber: (value: number) => String(value) }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: { tenantId: "tenant-1" } }),
}));

vi.mock("@/core/presentation/hooks/useVenueSetting", () => ({
  useVenueSetting: () => ({ trackStock: mocks.trackStock }),
}));

const noop = vi.fn().mockResolvedValue(undefined);

vi.mock("@/core/presentation/hooks/useProductManagement", () => ({
  useProductManagement: () => ({
    products: [
      new Product({ id: "p1", tenantId: "tenant-1", name: "Mojito", basePrice: "5000", totalOnHand: "0" }),
    ],
    variants: [],
    categories: [],
    uoms: [],
    taxRates: [],
    locations: [{ id: "loc-1", name: "Bar" }],
    page: 1,
    totalPages: 1,
    total: 1,
    variantPage: 1,
    variantTotalPages: 1,
    isLoading: false,
    error: null,
    listLookups: noop,
    listProducts: noop,
    createProduct: noop,
    updateProduct: noop,
    deleteProduct: noop,
    listVariants: noop,
    createVariant: noop,
    updateVariant: noop,
    deleteVariant: noop,
  }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProductsPage />
    </MemoryRouter>,
  );

describe("ProductsPage stock", () => {
  beforeEach(() => {
    mocks.trackStock = true;
  });

  it("shows on-hand stock and the stock filters for a business that keeps stock", () => {
    renderPage();
    expect(screen.getByText("products.onHand")).toBeInTheDocument();
    expect(screen.getByText("products.inStock")).toBeInTheDocument();
    expect(screen.getByLabelText("products.location")).toBeInTheDocument();
  });

  it("hides stock when stock control is off", () => {
    mocks.trackStock = false;
    renderPage();
    expect(screen.queryByText("products.onHand")).not.toBeInTheDocument();
    expect(screen.queryByText("products.inStock")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("products.location")).not.toBeInTheDocument();
  });
});
