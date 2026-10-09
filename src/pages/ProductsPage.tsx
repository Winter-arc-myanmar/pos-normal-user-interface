import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { ProductTrackingType } from "@/core/application/dtos/CashierDTO";
import { Product, ProductVariant } from "@/core/domain/entities/Cashier";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useProductManagement } from "@/core/presentation/hooks/useProductManagement";
import { useVenueSetting } from "@/core/presentation/hooks/useVenueSetting";
import { useNumberFormatter } from "@/lib/i18n/formatters";

const TRACKING: ProductTrackingType[] = ["STANDARD", "SERIALIZED"];

const fieldClass =
  "mt-1 min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500";

type Pair = { key: string; value: string };

type ProductDraft = {
  id: string;
  name: string;
  baseSku: string;
  basePrice: string;
  baseUomId: string;
  categoryId: string;
  trackingType: ProductTrackingType;
  isTaxable: boolean;
  isAvailable: boolean;
  taxRateId: string;
  imageUrl: string;
  attributes: Pair[];
};

type VariantDraft = {
  id: string;
  variantSku: string;
  barcode: string;
  priceModifier: string;
  imageUrl: string;
  options: Pair[];
};

const emptyPairs = (): Pair[] => [{ key: "", value: "" }];

const pairsFrom = (record?: Record<string, unknown>): Pair[] => {
  const entries = Object.entries(record || {});
  if (!entries.length) return emptyPairs();
  return entries.map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
};

const recordFrom = (pairs: Pair[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (!key) continue;
    const raw = pair.value.trim();
    if (
      (raw.startsWith("{") && raw.endsWith("}")) ||
      (raw.startsWith("[") && raw.endsWith("]"))
    ) {
      try {
        result[key] = JSON.parse(raw) as unknown;
        continue;
      } catch {
        result[key] = pair.value;
        continue;
      }
    }
    result[key] = pair.value;
  }
  return result;
};

const emptyProduct = (): ProductDraft => ({
  id: "",
  name: "",
  baseSku: "",
  basePrice: "",
  baseUomId: "",
  categoryId: "",
  trackingType: "STANDARD",
  isTaxable: true,
  isAvailable: true,
  taxRateId: "",
  imageUrl: "",
  attributes: emptyPairs(),
});

const emptyVariant = (): VariantDraft => ({
  id: "",
  variantSku: "",
  barcode: "",
  priceModifier: "",
  imageUrl: "",
  options: emptyPairs(),
});

const draftFromProduct = (product: Product): ProductDraft => ({
  id: product.id,
  name: product.name,
  baseSku: product.baseSku || "",
  basePrice: product.basePrice || "",
  baseUomId: product.baseUomId || "",
  categoryId: product.categoryId || "",
  trackingType:
    product.trackingType === "SERIALIZED" ? "SERIALIZED" : "STANDARD",
  isTaxable: product.isTaxable !== false,
  isAvailable: product.isAvailable !== false,
  taxRateId: product.taxRateId || "",
  imageUrl: product.sourceImageUrl || "",
  attributes: pairsFrom(product.globalAttributes),
});

const draftFromVariant = (variant: ProductVariant): VariantDraft => ({
  id: variant.id,
  variantSku: variant.variantSku || "",
  barcode: variant.barcode || "",
  priceModifier: variant.priceModifier || "",
  imageUrl: variant.sourceImageUrl || "",
  options: pairsFrom(variant.matrixOptions),
});

const optionLabel = (variant: ProductVariant) =>
  Object.entries(variant.matrixOptions || {})
    .map(([, value]) => (typeof value === "string" ? value : JSON.stringify(value)))
    .filter(Boolean)
    .join(" · ");

export function ProductsPage() {
  const { t } = useTranslation();
  const { formatNumber } = useNumberFormatter();
  const { user } = useAuth();
  const {
    products,
    variants,
    categories,
    uoms,
    taxRates,
    locations,
    page,
    totalPages,
    total,
    variantPage,
    variantTotalPages,
    isLoading,
    error,
    listLookups,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listVariants,
    createVariant,
    updateVariant,
    deleteVariant,
  } = useProductManagement();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [trackingType, setTrackingType] = useState<"ALL" | ProductTrackingType>("ALL");
  const { trackStock } = useVenueSetting();
  const [inStockOnly, setInStockOnly] = useState(false);
  const [locationId, setLocationId] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<ProductDraft>(emptyProduct);
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(emptyVariant);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmVariantDelete, setConfirmVariantDelete] = useState(false);

  useEffect(() => {
    void listLookups();
  }, [listLookups]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void listProducts({
        page: currentPage,
        limit: 20,
        search: search.trim() || undefined,
        sortBy: "name",
        sortOrder: "asc",
        categoryId: categoryId === "ALL" ? undefined : categoryId,
        trackingType: trackingType === "ALL" ? undefined : trackingType,
        inStockOnly: inStockOnly || undefined,
        locationId: locationId === "ALL" ? undefined : locationId,
      }).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [categoryId, currentPage, inStockOnly, listProducts, locationId, search, trackingType]);

  const categoryName = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );
  const uomName = useMemo(
    () =>
      new Map(
        uoms.map((uom) => [uom.id, uom.abbreviation ? `${uom.name} (${uom.abbreviation})` : uom.name])
      ),
    [uoms]
  );

  const money = (value?: string) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const quantity = (value?: string) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0";
    return formatNumber(amount, { maximumFractionDigits: 4 });
  };

  const startCreate = () => {
    setDraft(emptyProduct());
    setVariantDraft(emptyVariant());
    setConfirmDelete(false);
    setConfirmVariantDelete(false);
    setNotice(null);
  };

  const openProduct = (product: Product) => {
    setDraft(draftFromProduct(product));
    setVariantDraft(emptyVariant());
    setConfirmDelete(false);
    setConfirmVariantDelete(false);
    setNotice(null);
    void listVariants(product.id, {
      page: 1,
      limit: 20,
      sortBy: "variantSku",
      sortOrder: "asc",
    }).catch(() => undefined);
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: draft.name.trim(),
      baseSku: draft.baseSku.trim(),
      basePrice: draft.basePrice.trim(),
      baseUomId: draft.baseUomId,
      categoryId: draft.categoryId || undefined,
      globalAttributes: recordFrom(draft.attributes),
      imageUrl: draft.imageUrl.trim() || undefined,
      trackingType: draft.trackingType,
      isAvailable: draft.isAvailable,
      isTaxable: draft.isTaxable,
      taxRateId: draft.isTaxable && draft.taxRateId ? draft.taxRateId : undefined,
    };
    try {
      const saved = draft.id
        ? await updateProduct(draft.id, payload)
        : await createProduct({ ...payload, tenantId: user?.tenantId || "" });
      setDraft(draftFromProduct(saved));
      setNotice(t("products.saved"));
      setConfirmDelete(false);
    } catch {
      setNotice(null);
    }
  };

  const toggleAvailable = async (product: Product) => {
    try {
      const updated = await updateProduct(product.id, {
        isAvailable: product.isAvailable === false,
      });
      if (draft.id === product.id) setDraft(draftFromProduct(updated));
      setNotice(
        updated.isAvailable === false ? t("products.disabled") : t("products.enabled")
      );
    } catch {
      setNotice(null);
    }
  };

  const removeProduct = async () => {
    if (!draft.id) return;
    try {
      await deleteProduct(draft.id);
      startCreate();
      setNotice(t("products.deleted"));
    } catch {
      setNotice(null);
    }
  };

  const saveVariant = async () => {
    if (!draft.id) return;
    const payload = {
      variantSku: variantDraft.variantSku.trim(),
      matrixOptions: recordFrom(variantDraft.options),
      barcode: variantDraft.barcode.trim() || undefined,
      priceModifier: variantDraft.priceModifier.trim() || undefined,
      imageUrl: variantDraft.imageUrl.trim() || undefined,
    };
    try {
      const saved = variantDraft.id
        ? await updateVariant(draft.id, variantDraft.id, payload)
        : await createVariant(draft.id, payload);
      setVariantDraft(draftFromVariant(saved));
      setConfirmVariantDelete(false);
      setNotice(t("products.variantSaved"));
    } catch {
      setNotice(null);
    }
  };

  const removeVariant = async () => {
    if (!draft.id || !variantDraft.id) return;
    try {
      await deleteVariant(draft.id, variantDraft.id);
      setVariantDraft(emptyVariant());
      setConfirmVariantDelete(false);
      setNotice(t("products.variantDeleted"));
    } catch {
      setNotice(null);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080808] text-slate-100 min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,1.25fr)_minmax(22rem,28rem)] min-[1100px]:grid-rows-[auto_minmax(0,1fr)] min-[1100px]:gap-3 min-[1100px]:p-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 min-[1100px]:contents">
        <header className="flex min-w-0 flex-wrap items-center gap-2 min-[1100px]:col-span-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">{t("products.title")}</h1>
            <p className="text-xs text-slate-400">
              {t("products.subtitle", { count: total })}
            </p>
          </div>
          <div className="w-full min-w-0 sm:w-64">
            <SearchInput
              aria-label={t("products.search")}
              placeholder={t("products.search")}
              value={search}
              onChange={(event) => {
                setCurrentPage(1);
                setSearch(event.target.value);
              }}
              onClear={() => setSearch("")}
            />
          </div>
          <Button type="button" onClick={startCreate}>
            {t("products.add")}
          </Button>
        </header>

        <div className="flex h-80 shrink-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#101010] min-[1100px]:h-full min-[1100px]:min-h-0">
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-800 p-2">
            <FilterChip
              active={categoryId === "ALL"}
              label={t("products.allCategories")}
              onClick={() => {
                setCurrentPage(1);
                setCategoryId("ALL");
              }}
            />
            {categories.map((category) => (
              <FilterChip
                key={category.id}
                active={categoryId === category.id}
                label={category.name}
                onClick={() => {
                  setCurrentPage(1);
                  setCategoryId(category.id);
                }}
              />
            ))}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 px-2 py-2">
            <FilterChip
              active={trackingType === "ALL"}
              label={t("products.allTracking")}
              onClick={() => {
                setCurrentPage(1);
                setTrackingType("ALL");
              }}
            />
            {TRACKING.map((item) => (
              <FilterChip
                key={item}
                active={trackingType === item}
                label={t(`products.trackingOption.${item}`)}
                onClick={() => {
                  setCurrentPage(1);
                  setTrackingType(item);
                }}
              />
            ))}
            {trackStock ? (
              <FilterChip
                active={inStockOnly}
                label={t("products.inStock")}
                onClick={() => {
                  setCurrentPage(1);
                  setInStockOnly((current) => !current);
                }}
              />
            ) : null}
            {trackStock && locations.length > 0 ? (
              <select
                className="min-h-8 rounded-full border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200"
                value={locationId}
                aria-label={t("products.location")}
                onChange={(event) => {
                  setCurrentPage(1);
                  setLocationId(event.target.value);
                }}
              >
                <option value="ALL">{t("products.allLocations")}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {error ? (
            <p className="mx-2 rounded bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
          ) : null}
          <div className="relative m-2 min-h-0 flex-1 overflow-auto">
            {isLoading && products.length === 0 ? (
              <ApiLoadingState label={t("products.loading")} />
            ) : products.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">{t("products.empty")}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {products.map((product) => (
                  <li
                    key={product.id}
                    className={[
                      "flex gap-2 rounded-xl border p-2",
                      draft.id === product.id
                        ? "border-blue-500 bg-blue-950/40"
                        : "border-slate-800 bg-slate-950",
                      product.isAvailable === false ? "opacity-80" : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => openProduct(product)}
                      className="flex min-w-0 flex-1 gap-3 text-left"
                    >
                      <ProductThumb src={product.imageUrl} name={product.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{product.name}</span>
                        <span className="block truncate text-xs text-slate-400">
                          {product.baseSku || "—"}
                          {product.categoryName || categoryName.get(product.categoryId || "")
                            ? ` · ${product.categoryName || categoryName.get(product.categoryId || "")}`
                            : ""}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="text-sm font-medium">{money(product.basePrice)}</span>
                          {trackStock ? (
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                              {t("products.onHand", { count: quantity(product.totalOnHand) })}
                            </span>
                          ) : null}
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-[11px]",
                              product.isAvailable === false
                                ? "bg-slate-800 text-slate-400"
                                : "bg-emerald-950 text-emerald-300",
                            ].join(" ")}
                          >
                            {product.isAvailable === false
                              ? t("products.unavailable")
                              : t("products.available")}
                          </span>
                          {product.trackingType ? (
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                              {t(`products.trackingOption.${product.trackingType}`, {
                                defaultValue: product.trackingType,
                              })}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => void toggleAvailable(product)}
                      className={[
                        "self-center shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                        product.isAvailable === false
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-800 text-slate-200",
                      ].join(" ")}
                    >
                      {product.isAvailable === false
                        ? t("products.enable")
                        : t("products.disable")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-slate-800 px-2 py-2 text-xs text-slate-400">
            <button
              type="button"
              className="min-h-9 min-w-9 rounded bg-slate-800 disabled:opacity-40"
              disabled={page <= 1 || isLoading}
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              aria-label={t("products.prevPage")}
            >
              ‹
            </button>
            <span>
              {page} / {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              className="min-h-9 min-w-9 rounded bg-slate-800 disabled:opacity-40"
              disabled={page >= totalPages || isLoading}
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              aria-label={t("products.nextPage")}
            >
              ›
            </button>
          </div>
        </div>

        <aside className="flex shrink-0 flex-col gap-3 min-[1100px]:min-h-0 min-[1100px]:overflow-y-auto">
        <form
          id="product-form"
          onSubmit={(event) => void saveProduct(event)}
          className="shrink-0 rounded-xl border border-slate-800 bg-slate-950 p-4"
        >
          <h2 className="text-base font-semibold">
            {draft.id ? t("products.edit") : t("products.create")}
          </h2>
          {notice ? <p className="mt-2 text-sm text-emerald-300">{notice}</p> : null}
          <label className="mt-3 block text-xs text-slate-400">
            {t("products.name")}
            <input
              required
              className={fieldClass}
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
            <label className="text-xs text-slate-400">
              {t("products.sku")}
              <input
                required
                className={fieldClass}
                value={draft.baseSku}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, baseSku: event.target.value }))
                }
              />
            </label>
            <label className="text-xs text-slate-400">
              {t("products.basePrice")}
              <input
                required
                inputMode="decimal"
                className={fieldClass}
                value={draft.basePrice}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, basePrice: event.target.value }))
                }
              />
            </label>
            <label className="text-xs text-slate-400">
              {t("products.category")}
              <select
                className={fieldClass}
                value={draft.categoryId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, categoryId: event.target.value }))
                }
              >
                <option value="">{t("products.chooseCategory")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              {t("products.uom")}
              <select
                required
                className={fieldClass}
                value={draft.baseUomId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, baseUomId: event.target.value }))
                }
              >
                <option value="">{t("products.chooseUom")}</option>
                {uoms.map((uom) => (
                  <option key={uom.id} value={uom.id}>
                    {uomName.get(uom.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-400">{t("products.tracking")}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {TRACKING.map((item) => (
              <FilterChip
                key={item}
                active={draft.trackingType === item}
                label={t(`products.trackingOption.${item}`)}
                onClick={() => setDraft((current) => ({ ...current, trackingType: item }))}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <FilterChip
              active={draft.isAvailable}
              label={
                draft.isAvailable ? t("products.available") : t("products.unavailable")
              }
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  isAvailable: !current.isAvailable,
                }))
              }
            />
            <FilterChip
              active={draft.isTaxable}
              label={t("products.taxable")}
              onClick={() =>
                setDraft((current) => ({ ...current, isTaxable: !current.isTaxable }))
              }
            />
            {draft.isTaxable ? (
              <label className="min-w-0 flex-1 text-xs text-slate-400">
                {t("products.taxRate")}
                <select
                  className={fieldClass}
                  value={draft.taxRateId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, taxRateId: event.target.value }))
                  }
                >
                  <option value="">{t("products.chooseTaxRate")}</option>
                  {taxRates.map((rate) => (
                    <option key={rate.id} value={rate.id}>
                      {rate.name} · {quantity(rate.ratePercentage)}%
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <label className="mt-3 block text-xs text-slate-400">
            {t("products.imageUrl")}
            <input
              className={fieldClass}
              value={draft.imageUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, imageUrl: event.target.value }))
              }
            />
          </label>
          <PairFields
            title={t("products.attributes")}
            keyLabel={t("products.attributeKey")}
            valueLabel={t("products.attributeValue")}
            addLabel={t("products.addAttribute")}
            removeLabel={t("common.delete")}
            pairs={draft.attributes}
            onChange={(attributes) => setDraft((current) => ({ ...current, attributes }))}
          />
          <div className="mt-4 hidden gap-2 min-[1100px]:flex">
            <Button type="submit" isLoading={isLoading} fullWidth>
              {t("common.save")}
            </Button>
            {draft.id ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => (confirmDelete ? void removeProduct() : setConfirmDelete(true))}
              >
                {confirmDelete ? t("products.confirmDelete") : t("common.delete")}
              </Button>
            ) : null}
          </div>
        </form>

        <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-950 p-4 min-[1100px]:min-h-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("products.variants")}</h3>
              {draft.id ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setVariantDraft(emptyVariant());
                    setConfirmVariantDelete(false);
                  }}
                >
                  {t("products.addVariant")}
                </Button>
              ) : null}
            </div>
            {draft.id ? (
              <>
                {variants.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">{t("products.noVariants")}</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {variants.map((variant) => (
                      <li key={variant.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setVariantDraft(draftFromVariant(variant));
                            setConfirmVariantDelete(false);
                          }}
                          className={[
                            "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm",
                            variantDraft.id === variant.id
                              ? "border-blue-500 bg-blue-950/40"
                              : "border-slate-800 bg-[#101010]",
                          ].join(" ")}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{variant.variantSku || variant.id}</span>
                            <span className="block truncate text-xs text-slate-400">
                              {optionLabel(variant) || "—"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-300">
                            {variant.priceModifier ? money(variant.priceModifier) : "—"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {variantTotalPages > 1 ? (
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <button
                      type="button"
                      className="min-h-9 min-w-9 rounded bg-slate-800 disabled:opacity-40"
                      disabled={variantPage <= 1 || isLoading}
                      onClick={() =>
                        void listVariants(draft.id, {
                          page: Math.max(1, variantPage - 1),
                          limit: 20,
                          sortBy: "variantSku",
                          sortOrder: "asc",
                        })
                      }
                      aria-label={t("products.prevPage")}
                    >
                      ‹
                    </button>
                    <span>
                      {variantPage} / {variantTotalPages}
                    </span>
                    <button
                      type="button"
                      className="min-h-9 min-w-9 rounded bg-slate-800 disabled:opacity-40"
                      disabled={variantPage >= variantTotalPages || isLoading}
                      onClick={() =>
                        void listVariants(draft.id, {
                          page: variantPage + 1,
                          limit: 20,
                          sortBy: "variantSku",
                          sortOrder: "asc",
                        })
                      }
                      aria-label={t("products.nextPage")}
                    >
                      ›
                    </button>
                  </div>
                ) : null}
                <div className="mt-3 rounded-lg border border-slate-800 p-3">
                  <p className="text-xs font-medium text-slate-300">
                    {variantDraft.id ? t("products.variantEdit") : t("products.variantCreate")}
                  </p>
                  <label className="mt-2 block text-xs text-slate-400">
                    {t("products.variantSku")}
                    <input
                      className={fieldClass}
                      value={variantDraft.variantSku}
                      onChange={(event) =>
                        setVariantDraft((current) => ({
                          ...current,
                          variantSku: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
                    <label className="text-xs text-slate-400">
                      {t("products.barcode")}
                      <input
                        className={fieldClass}
                        value={variantDraft.barcode}
                        onChange={(event) =>
                          setVariantDraft((current) => ({
                            ...current,
                            barcode: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="text-xs text-slate-400">
                      {t("products.priceModifier")}
                      <input
                        inputMode="decimal"
                        className={fieldClass}
                        value={variantDraft.priceModifier}
                        onChange={(event) =>
                          setVariantDraft((current) => ({
                            ...current,
                            priceModifier: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="mt-2 block text-xs text-slate-400">
                    {t("products.imageUrl")}
                    <input
                      className={fieldClass}
                      value={variantDraft.imageUrl}
                      onChange={(event) =>
                        setVariantDraft((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <PairFields
                    title={t("products.options")}
                    keyLabel={t("products.optionKey")}
                    valueLabel={t("products.optionValue")}
                    addLabel={t("products.addOption")}
                    removeLabel={t("common.delete")}
                    pairs={variantDraft.options}
                    onChange={(options) =>
                      setVariantDraft((current) => ({ ...current, options }))
                    }
                  />
                  <div className="mt-3 flex gap-2">
                    <Button type="button" fullWidth onClick={() => void saveVariant()}>
                      {t("products.saveVariant")}
                    </Button>
                    {variantDraft.id ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() =>
                          confirmVariantDelete ? void removeVariant() : setConfirmVariantDelete(true)
                        }
                      >
                        {confirmVariantDelete ? t("products.confirmDelete") : t("common.delete")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-slate-500">{t("products.variantHint")}</p>
            )}
        </div>
        </aside>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-slate-800 bg-slate-950 p-3 min-[1100px]:hidden">
        <Button type="submit" form="product-form" isLoading={isLoading} fullWidth>
          {t("common.save")}
        </Button>
        {draft.id ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => (confirmDelete ? void removeProduct() : setConfirmDelete(true))}
          >
            {confirmDelete ? t("products.confirmDelete") : t("common.delete")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function ProductThumb({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-base font-semibold uppercase text-slate-400">
        {name.trim().slice(0, 1) || "?"}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="h-14 w-14 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-full px-3 py-1 text-xs",
        active ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function PairFields({
  title,
  keyLabel,
  valueLabel,
  addLabel,
  removeLabel,
  pairs,
  onChange,
}: {
  title: string;
  keyLabel: string;
  valueLabel: string;
  addLabel: string;
  removeLabel: string;
  pairs: Pair[];
  onChange: (pairs: Pair[]) => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{title}</p>
        <button
          type="button"
          className="text-xs text-blue-300"
          onClick={() => onChange([...pairs, { key: "", value: "" }])}
        >
          {addLabel}
        </button>
      </div>
      <div className="mt-1 flex flex-col gap-2">
        {pairs.map((pair, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <input
              className={fieldClass}
              placeholder={keyLabel}
              aria-label={keyLabel}
              value={pair.key}
              onChange={(event) =>
                onChange(
                  pairs.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, key: event.target.value } : item
                  )
                )
              }
            />
            <input
              className={fieldClass}
              placeholder={valueLabel}
              aria-label={valueLabel}
              value={pair.value}
              onChange={(event) =>
                onChange(
                  pairs.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, value: event.target.value } : item
                  )
                )
              }
            />
            <button
              type="button"
              className="mt-1 min-h-10 min-w-10 rounded-lg bg-slate-800 text-slate-300"
              onClick={() =>
                onChange(pairs.length === 1 ? emptyPairs() : pairs.filter((_, itemIndex) => itemIndex !== index))
              }
              aria-label={removeLabel}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
