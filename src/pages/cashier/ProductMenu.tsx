import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import {
  ChosenModifier,
  ModifierGroup,
  Product,
  ProductVariant,
} from "@/core/domain/entities/Cashier";
import {
  chosenModifiers,
  defaultOptions,
  groupLimit,
  groupNeed,
  missingGroup,
  toggleOption,
} from "@/lib/modifiers/choices";

interface ProductMenuProps {
  products: Product[];
  variantsByProductId: Record<string, ProductVariant[]>;
  orderedProductQuantities?: Record<string, number>;
  onLoadVariants: (productId: string) => Promise<ProductVariant[]>;
  onAdd: (
    product: Product,
    variantId: string,
    quantity: number,
    modifiers?: ChosenModifier[]
  ) => Promise<void>;
  onClose: () => void;
  /** Asks for the item's options (add-ons) before adding it. */
  offerOptions?: boolean;
  groupByCategory?: boolean;
  /** Shown under the search, e.g. category filters the page owns. */
  toolbar?: ReactNode;
}

const variantLabel = (variant: ProductVariant): string =>
  variant.variantSku ||
  String(Object.values(variant.matrixOptions || {}).join(" / ")) ||
  variant.id.slice(0, 8);

const productCardImage = (
  product: Product,
  variantsByProductId: Record<string, ProductVariant[]>
): string | undefined =>
  product.imageUrl ||
  (variantsByProductId[product.id] || []).find((variant) => variant.imageUrl)
    ?.imageUrl;

function ProductCardImage({
  src,
  name,
}: {
  src?: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex h-14 items-center justify-center bg-slate-800 [@media(min-height:640px)]:h-24 text-lg font-semibold uppercase text-slate-500">
        {name.trim().slice(0, 1) || "?"}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="h-14 w-full object-cover [@media(min-height:640px)]:h-24"
      onError={() => setFailed(true)}
    />
  );
}

function OptionGroup({
  group,
  selected,
  onToggle,
}: {
  group: ModifierGroup;
  selected: string[];
  onToggle: (optionId: string) => void;
}) {
  const { t } = useTranslation();
  const limit = groupLimit(group);
  const need = groupNeed(group);
  const picked = group.modifiers.filter((option) => selected.includes(option.id)).length;
  const hint =
    limit === 1
      ? t("cashier.productMenu.pickOne")
      : limit === Infinity
        ? t("cashier.productMenu.pickAny")
        : t("cashier.productMenu.pickUpTo", { count: limit });
  return (
    <fieldset className="mt-4">
      <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-semibold">
        <span>
          {group.name}
          {need > 0 ? (
            <span className="ml-2 text-xs font-normal text-amber-300">
              {t("cashier.productMenu.required")}
            </span>
          ) : null}
        </span>
        <span className="text-xs font-normal text-slate-400">{hint}</span>
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {group.modifiers.map((option) => {
          const on = selected.includes(option.id);
          const full = !on && limit !== 1 && picked >= limit;
          const price = Number(option.priceDelta) || 0;
          return (
            <button
              key={option.id}
              type="button"
              role={limit === 1 ? "radio" : "checkbox"}
              aria-checked={on}
              disabled={full}
              onClick={() => onToggle(option.id)}
              className={[
                "flex items-center justify-between gap-2 rounded border px-3 py-3 text-left text-sm",
                on ? "border-blue-500 bg-blue-500/10" : "border-slate-700 bg-slate-900",
                full ? "cursor-not-allowed opacity-50" : "",
              ].join(" ")}
            >
              <span className="min-w-0 break-words">{option.name}</span>
              {price ? (
                <span className="shrink-0 text-xs text-blue-300">
                  {price > 0 ? "+" : ""}
                  {price}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProductMenu({
  products,
  variantsByProductId,
  orderedProductQuantities = {},
  onLoadVariants,
  onAdd,
  onClose,
  groupByCategory = false,
  toolbar,
  offerOptions = false,
}: ProductMenuProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [variantOptions, setVariantOptions] = useState<ProductVariant[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [needsVariantChoice, setNeedsVariantChoice] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  // Tapping a second product while the first one's variants are still loading
  // must not let the first response open or add the wrong product.
  const selectedProductIdRef = useRef("");

  const categoryOf = useCallback(
    (product: Product) => product.categoryName || t("cashier.productMenu.otherCategory"),
    [t]
  );

  const categories = useMemo(
    () =>
      groupByCategory
        ? [...new Set(products.map(categoryOf))].sort((left, right) =>
            left.localeCompare(right)
          )
        : [],
    [categoryOf, groupByCategory, products]
  );

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        (!category || categoryOf(product) === category) &&
        (!keyword ||
          [product.name, product.baseSku]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword)))
    );
  }, [category, categoryOf, products, search]);

  const variants = variantOptions.length
    ? variantOptions
    : selectedProduct
      ? variantsByProductId[selectedProduct.id] || []
      : [];

  const optionGroupsOf = (product: Product | null): ModifierGroup[] =>
    offerOptions && product
      ? (product.modifierGroups || []).filter((group) => group.modifiers.length)
      : [];
  const optionGroups = optionGroupsOf(selectedProduct);

  const closeVariantModal = () => {
    selectedProductIdRef.current = "";
    setNeedsVariantChoice(false);
    setSelectedOptions([]);
    setSelectedProduct(null);
    setSelectedVariantId("");
    setVariantOptions([]);
    setQuantity(1);
    setLocalError(null);
  };

  const loadVariants = async (product: Product): Promise<ProductVariant[]> => {
    const cached = variantsByProductId[product.id] || [];
    if (cached.length) return cached;
    return onLoadVariants(product.id);
  };

  const addProduct = async (
    product: Product,
    variantId: string,
    nextQuantity: number,
    modifiers?: ChosenModifier[]
  ) => {
    if (!variantId) return false;
    setIsAdding(true);
    setLocalError(null);
    try {
      await onAdd(product, variantId, nextQuantity, modifiers);
      setQuantity(1);
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setLocalError(
        /throttler|too many requests/i.test(message)
          ? t("cashier.errors.tooManyRequests")
          : message || t("cashier.errors.addProduct")
      );
      return false;
    } finally {
      setIsAdding(false);
    }
  };

  const selectProduct = async (product: Product) => {
    if (product.isAvailable === false) {
      setLocalError(t("cashier.productMenu.unavailable"));
      return;
    }
    selectedProductIdRef.current = product.id;
    setSelectedProduct(product);
    setQuantity(1);
    setLocalError(null);
    setNeedsVariantChoice(false);
    setVariantOptions([]);

    try {
      const loaded = await loadVariants(product);
      if (selectedProductIdRef.current !== product.id) return;
      const defaultVariantId = loaded[0]?.id || "";
      setSelectedVariantId(defaultVariantId);
      setVariantOptions(loaded);

      const groups = optionGroupsOf(product);
      if (loaded.length > 1 || (defaultVariantId && groups.length)) {
        setSelectedOptions(defaultOptions(groups));
        setNeedsVariantChoice(true);
        return;
      }

      if (!defaultVariantId) {
        setLocalError(t("cashier.productMenu.noVariant"));
        return;
      }

      await addProduct(product, defaultVariantId, 1);
    } catch (caught) {
      if (selectedProductIdRef.current !== product.id) return;
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.errors.loadVariants")
      );
    }
  };

  const addSelected = async () => {
    if (!selectedProduct || !selectedVariantId) return;
    const missing = missingGroup(optionGroups, selectedOptions);
    if (missing) {
      setLocalError(t("cashier.productMenu.pickFrom", { name: missing.name }));
      return;
    }
    const modifiers = chosenModifiers(optionGroups, selectedOptions);
    const added = await addProduct(
      selectedProduct,
      selectedVariantId,
      quantity,
      modifiers.length ? modifiers : undefined
    );
    if (added) closeVariantModal();
  };

  return (
    <section className="flex h-full min-h-0 flex-col px-2 pt-2 text-white">
      <header className="flex items-center gap-2 border-b border-white/10 pb-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("cashier.productMenu.search")}
          className="min-h-10 min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500"
        />
        <Button variant="outline" onClick={onClose}>
          {t("cashier.productMenu.close")}
        </Button>
      </header>

      {toolbar}

      {groupByCategory && categories.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {["", ...categories].map((name) => (
            <button
              key={name || "all"}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                category === name
                  ? "bg-slate-100 text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {name || t("cashier.productMenu.allCategories")}
            </button>
          ))}
        </div>
      ) : null}

      <div className="pos-scroll-hint mt-2 min-h-0 flex-1 overflow-y-auto p-1">
        <div className="grid content-start grid-cols-[repeat(auto-fill,minmax(min(9.5rem,calc(50%_-_0.25rem)),1fr))] gap-2">
          {visibleProducts.map((product) => {
            const orderedQty = Number(orderedProductQuantities[product.id] || 0);
            const isSelected =
              selectedProduct?.id === product.id || orderedQty > 0;
            const unavailable = product.isAvailable === false;
            return (
              <button
                key={product.id}
                type="button"
                aria-pressed={isSelected}
                disabled={unavailable}
                onClick={() => void selectProduct(product)}
                className={[
                  "relative flex flex-col overflow-hidden rounded border bg-[#181818] text-left",
                  unavailable ? "cursor-not-allowed opacity-50" : "",
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-400 ring-offset-1 ring-offset-[#070707]"
                    : "border-slate-700",
                ].join(" ")}
              >
                <ProductCardImage
                  src={productCardImage(product, variantsByProductId)}
                  name={product.name}
                />
                {unavailable ? (
                  <span className="absolute right-2 top-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                    {t("cashier.productMenu.unavailable")}
                  </span>
                ) : orderedQty > 0 ? (
                  <span className="absolute right-2 top-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {orderedQty}
                  </span>
                ) : null}
                <span className="block flex-1 px-3 py-2">
                  <span className="line-clamp-2 break-words text-sm font-semibold leading-snug">
                    {product.name}
                  </span>
                  <span className="mt-1 block font-semibold text-blue-400">
                    {product.basePrice}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {visibleProducts.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">
            {t("cashier.productMenu.notFound")}
          </p>
        ) : null}
      </div>
      {localError && !needsVariantChoice ? (
        <p className="mt-2 text-xs text-red-300">{localError}</p>
      ) : null}

      {needsVariantChoice && selectedProduct ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-variant-title"
          onClick={closeVariantModal}
        >
          <div
            className="max-h-[calc(100dvh-4rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-[#181818] p-5 text-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {variants.length > 1
                    ? t("cashier.productMenu.chooseVariant")
                    : t("cashier.productMenu.chooseOptions")}
                </p>
                <h2
                  id="product-variant-title"
                  className="mt-1 text-lg font-semibold"
                >
                  {selectedProduct.name}
                </h2>
              </div>
              <Button variant="outline" size="sm" onClick={closeVariantModal}>
                {t("common.cancel")}
              </Button>
            </div>

            {variants.length > 1 ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {variants.map((variant) => {
                  const selected = selectedVariantId === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={[
                        "rounded border px-3 py-3 text-left text-sm",
                        selected
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700 bg-slate-900",
                      ].join(" ")}
                    >
                      {variantLabel(variant)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {optionGroups.map((group) => (
              <OptionGroup
                key={group.id}
                group={group}
                selected={selectedOptions}
                onToggle={(optionId) =>
                  setSelectedOptions((current) =>
                    toggleOption(current, group, optionId)
                  )
                }
              />
            ))}

            <label className="mt-4 block text-xs text-slate-300">
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

            {localError ? (
              <p className="mt-3 text-xs text-red-300">{localError}</p>
            ) : null}

            <Button
              className="mt-4"
              fullWidth
              disabled={!selectedVariantId}
              isLoading={isAdding}
              onClick={() => void addSelected()}
            >
              {t("cashier.productMenu.add")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
