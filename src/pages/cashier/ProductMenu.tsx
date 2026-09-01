import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Product, ProductVariant } from "@/core/domain/entities/Cashier";

interface ProductMenuProps {
  products: Product[];
  variantsByProductId: Record<string, ProductVariant[]>;
  onLoadVariants: (productId: string) => Promise<ProductVariant[]>;
  onAdd: (
    product: Product,
    variantId: string,
    quantity: number
  ) => Promise<void>;
  onClose: () => void;
}

export function ProductMenu({
  products,
  variantsByProductId,
  onLoadVariants,
  onAdd,
  onClose,
}: ProductMenuProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) =>
      [product.name, product.baseSku]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [products, search]);

  const variants = selectedProduct
    ? variantsByProductId[selectedProduct.id] || []
    : [];

  const selectProduct = async (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setLocalError(null);
    try {
      const loaded = await onLoadVariants(product.id);
      setSelectedVariantId(loaded[0]?.id || "");
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to load variants"
      );
    }
  };

  const addSelected = async () => {
    if (!selectedProduct || !selectedVariantId) return;
    setIsAdding(true);
    setLocalError(null);
    try {
      await onAdd(selectedProduct, selectedVariantId, quantity);
      setQuantity(1);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to add product"
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col text-white">
      <header className="flex items-center gap-2 border-b border-white/10 pb-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("cashier.productMenu.search")}
          className="min-h-10 flex-1 rounded border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500"
        />
        <Button variant="outline" onClick={onClose}>
          {t("cashier.productMenu.close")}
        </Button>
      </header>

      <div className="mt-2 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_13rem] gap-2">
        <div className="grid content-start grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => void selectProduct(product)}
              className={[
                "min-h-24 rounded border bg-[#181818] p-3 text-left",
                selectedProduct?.id === product.id
                  ? "border-blue-500"
                  : "border-slate-700",
              ].join(" ")}
            >
              <span className="block truncate text-sm font-semibold">
                {product.name}
              </span>
              <span className="mt-2 block text-xs text-slate-400">
                {product.baseSku || t("cashier.productMenu.noSku")}
              </span>
              <span className="mt-1 block font-semibold text-blue-400">
                {product.basePrice}
              </span>
            </button>
          ))}
          {visibleProducts.length === 0 ? (
            <p className="col-span-full p-6 text-center text-sm text-slate-400">
              {t("cashier.productMenu.notFound")}
            </p>
          ) : null}
        </div>

        <aside className="rounded border border-slate-700 bg-slate-900 p-3">
          {selectedProduct ? (
            <div className="space-y-3">
              <div>
                <p className="font-semibold">{selectedProduct.name}</p>
                <p className="text-xs text-slate-400">
                  {selectedProduct.baseSku ||
                    t("cashier.productMenu.noSku")}
                </p>
              </div>

              <label className="block text-xs text-slate-300">
                {t("cashier.productMenu.variant")}
                <select
                  value={selectedVariantId}
                  onChange={(event) => setSelectedVariantId(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded border border-slate-600 bg-slate-800 px-2 text-sm"
                >
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.variantSku ||
                        String(
                          Object.values(variant.matrixOptions || {}).join(" / ")
                        ) ||
                        variant.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs text-slate-300">
                {t("cashier.productMenu.quantity")}
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="mt-1 min-h-10 w-full rounded border border-slate-600 bg-slate-800 px-2 text-sm"
                />
              </label>

              <Button
                fullWidth
                disabled={!selectedVariantId}
                isLoading={isAdding}
                onClick={() => void addSelected()}
              >
                {t("cashier.productMenu.add")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {t("cashier.productMenu.selectPrompt")}
            </p>
          )}
          {localError ? (
            <p className="mt-3 text-xs text-red-300">{localError}</p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
