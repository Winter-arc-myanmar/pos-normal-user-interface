import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import {
  PrintPaperWidth,
  PrintTemplateSettings,
  PrintTemplateType,
  defaultPrintTemplateSettings,
} from "@/core/domain/entities/PrintTemplate";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { usePrintTemplateManagement } from "@/core/presentation/hooks/usePrintTemplateManagement";
import { PrintPlace } from "@/lib/printing/formatKdsTicket";
import { templatesForPrintPlace } from "@/lib/printing/selectPrintTemplate";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500";

type Draft = {
  id: string;
  name: string;
  locationScope: "CURRENT" | "ALL";
  type: PrintTemplateType;
  paperWidth: PrintPaperWidth;
  isDefault: boolean;
  settings: PrintTemplateSettings;
};

const placeOf = (template: {
  type: PrintTemplateType;
  isDefault?: boolean;
}): PrintPlace =>
  template.type === "KITCHEN" ? "KDS" : template.isDefault ? "CHECKOUT" : "FINANCE";

const emptyDraft = (): Draft => ({
  id: "",
  name: "Default receipt",
  locationScope: "CURRENT",
  type: "RECEIPT",
  paperWidth: "MM80",
  isDefault: true,
  settings: defaultPrintTemplateSettings(),
});

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 text-sm text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

const itemFontClass: Record<string, string> = {
  SMALL: "text-[10px]",
  MIDDLE: "text-[13px]",
  LARGE: "text-base",
};

function ReceiptPreview({
  settings,
  paperWidth,
  type,
}: {
  settings: PrintTemplateSettings;
  paperWidth: PrintPaperWidth;
  type: PrintTemplateType;
}) {
  const { t } = useTranslation();
  const showItemPrice = settings.item.price;
  const isKitchen = type === "KITCHEN";
  return (
    <div
      className={[
        "mx-auto bg-white px-4 py-5 font-mono text-slate-900 shadow",
        paperWidth === "MM58" ? "w-[180px]" : "w-[260px]",
      ].join(" ")}
    >
      <p className="text-center text-[10px] uppercase tracking-wide text-slate-500">
        {isKitchen
          ? t("settings.printTemplate.kitchen")
          : t("settings.printTemplate.receipt")}
      </p>
      {settings.header.outletName ? (
        <p className="text-center text-sm font-bold">
          {t("settings.printTemplate.previewOutlet")}
        </p>
      ) : null}
      <p className="my-2 border-t border-dashed border-slate-400" />
      {settings.other.orderNumber ? <p className="text-[11px]">No.001</p> : null}
      {settings.other.serviceType ? <p className="text-[11px]">Dine in</p> : null}
      {settings.other.tableOrRoom ? <p className="text-[11px]">Table 4</p> : null}
      {settings.other.cashier ? <p className="text-[11px]">Cashier</p> : null}
      {settings.other.pickupCode ? <p className="text-[11px]">Pickup 12</p> : null}
      <p className="my-2 border-t border-dashed border-slate-400" />
      <div
        className={[
          "flex justify-between font-bold",
          itemFontClass[settings.item.fontSize] || itemFontClass.MIDDLE,
        ].join(" ")}
      >
        {settings.item.qtyFirst ? <span>1</span> : null}
        <span className="flex-1 px-2">
          Coffee
        </span>
        {showItemPrice ? <span className="shrink-0">10.00</span> : null}
      </div>
      {settings.item.modifiers ? (
        <p className="pl-4 text-[11px]">{showItemPrice ? "+ Large 2.00" : "+ Large"}</p>
      ) : null}
      {settings.item.categorySubtotal ? (
        <p className="mt-1 text-right text-[11px]">Drinks 10.00</p>
      ) : null}
      {isKitchen ? null : (
        <>
          <p className="my-2 border-t border-dashed border-slate-400" />
          {settings.bill.amountAfterDiscount ? (
            <div className="flex justify-between text-[11px]">
              <span>{t("settings.printTemplate.amountAfterDiscount")}</span>
              <span>10.00</span>
            </div>
          ) : null}
          {settings.bill.totalPayment ? (
            <div className="flex justify-between text-[11px] font-bold">
              <span>{t("settings.printTemplate.totalPayment")}</span>
              <span>10.00</span>
            </div>
          ) : null}
          {settings.bill.payTime ? <p className="text-[11px]">09:50</p> : null}
        </>
      )}
      {settings.other.footerText ? (
        <p className="mt-3 text-center text-[11px]">{settings.other.footerText}</p>
      ) : null}
    </div>
  );
}

export function PrintTemplateSettingsPanel() {
  const { t } = useTranslation();
  const { activeLocationId } = usePosWorkspace();
  const {
    templates,
    isLoading,
    error,
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = usePrintTemplateManagement();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void listTemplates({ page: 1, limit: 50 }).catch(() => undefined);
  }, [listTemplates]);

  const patchSettings = (settings: PrintTemplateSettings) =>
    setDraft((current) => ({ ...current, settings }));

  const applyPlace = (place: PrintPlace) => {
    setDraft((current) => ({
      ...current,
      type: place === "KDS" ? "KITCHEN" : "RECEIPT",
      isDefault: place !== "FINANCE",
      settings: {
        ...current.settings,
        header: {
          ...current.settings.header,
          logo: place === "CHECKOUT",
          address: place !== "FINANCE",
          contact: place !== "FINANCE",
        },
        item: {
          ...current.settings.item,
          price: place !== "KDS",
          modifiers: place !== "FINANCE",
          productRemarks: place !== "FINANCE",
        },
      },
    }));
  };

  const place = placeOf(draft);
  const places: PrintPlace[] = ["KDS", "CHECKOUT", "FINANCE"];
  const placeCopy: Record<PrintPlace, { label: string; hint: string }> = {
    KDS: {
      label: t("settings.printTemplate.placeKds"),
      hint: t("settings.printTemplate.placeKdsHint"),
    },
    CHECKOUT: {
      label: t("settings.printTemplate.placeCheckout"),
      hint: t("settings.printTemplate.placeCheckoutHint"),
    },
    FINANCE: {
      label: t("settings.printTemplate.placeFinance"),
      hint: t("settings.printTemplate.placeFinanceHint"),
    },
  };

  const selectTemplate = (id: string) => {
    const template = templates.find((item) => item.id === id);
    if (!template) {
      setDraft(emptyDraft());
      return;
    }
    setDraft({
      id: template.id,
      name: template.name,
      locationScope: template.locationId ? "CURRENT" : "ALL",
      type: template.type,
      paperWidth: template.paperWidth,
      isDefault: Boolean(template.isDefault),
      settings: template.settings,
    });
    setNotice(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    const locationId =
      draft.locationScope === "CURRENT" ? activeLocationId || undefined : undefined;
    try {
      if (draft.id) {
        const updated = await updateTemplate(draft.id, {
          name: draft.name,
          paperWidth: draft.paperWidth,
          isDefault: draft.isDefault,
          settings: draft.settings,
        });
        setDraft((current) => ({ ...current, id: updated.id }));
      } else {
        const created = await createTemplate({
          type: draft.type,
          name: draft.name,
          locationId,
          paperWidth: draft.paperWidth,
          isDefault: draft.isDefault,
          settings: draft.settings,
        });
        setDraft((current) => ({ ...current, id: created.id }));
      }
      setNotice(t("settings.printTemplate.saved"));
    } catch {
      setNotice(null);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    await deleteTemplate(draft.id);
    setDraft(emptyDraft());
    setNotice(t("settings.printTemplate.deleted"));
  };

  const { settings } = draft;
  const otherFields =
    draft.type === "KITCHEN"
      ? (["orderNumber"] as const)
      : ([
          "orderNumber",
          "cashier",
          "serviceType",
          "tableOrRoom",
          "pickupCode",
        ] as const);
  const billFields =
    place === "CHECKOUT"
      ? (["amountAfterDiscount", "totalPayment", "payTime"] as const)
      : (["amountAfterDiscount", "totalPayment"] as const);

  return (
    <form onSubmit={(event) => void save(event)} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            {t("settings.printTemplate.howTitle")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {t("settings.printTemplate.howBody")}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {places.map((item) => {
              const competing = templatesForPrintPlace(
                item,
                templates,
                activeLocationId
              );
              const active = competing.length === 1 ? competing[0] : undefined;
              const body = (
                <>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {placeCopy[item].label}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-900">
                    {active?.name ||
                      (competing.length > 1
                        ? competing.map((template) => template.name).join(", ")
                        : t("settings.printTemplate.notSet"))}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {competing.length > 1
                      ? t("settings.printTemplate.conflict", {
                          name: competing.map((template) => template.name).join(", "),
                        })
                      : t("settings.printTemplate.printingNow")}
                  </span>
                </>
              );
              return active ? (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectTemplate(active.id)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-blue-300"
                >
                  {body}
                </button>
              ) : (
                <div
                  key={item}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left"
                >
                  {body}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-600 sm:col-span-2">
              {t("settings.printTemplate.savedTemplates")}
              <select
                className={fieldClass}
                value={draft.id}
                onChange={(event) => selectTemplate(event.target.value)}
              >
                <option value="">{t("settings.printTemplate.newTemplate")}</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} — {placeCopy[placeOf(template)].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600 sm:col-span-2">
              {t("settings.printTemplate.name")}
              <input
                className={fieldClass}
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm text-slate-600">
                {t("settings.printTemplate.usedFor")}
              </legend>
              <div className="mt-1 grid gap-2 sm:grid-cols-3">
                {places.map((item) => {
                  const locked =
                    Boolean(draft.id) &&
                    ((draft.type === "KITCHEN" && item !== "KDS") ||
                      (draft.type === "RECEIPT" && item === "KDS"));
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={place === item}
                      disabled={locked}
                      onClick={() => applyPlace(item)}
                      className={[
                        "rounded-lg border px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50",
                        place === item
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-800",
                      ].join(" ")}
                    >
                      <span className="block text-sm font-semibold">
                        {placeCopy[item].label}
                      </span>
                      <span
                        className={[
                          "mt-1 block text-xs leading-5",
                          place === item ? "text-blue-100" : "text-slate-500",
                        ].join(" ")}
                      >
                        {placeCopy[item].hint}
                      </span>
                    </button>
                  );
                })}
              </div>
              {draft.id ? (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {draft.type === "KITCHEN"
                    ? t("settings.printTemplate.lockedKitchen")
                    : t("settings.printTemplate.lockedReceipt")}
                </p>
              ) : null}
            </fieldset>
            <label className="text-sm text-slate-600">
              {t("settings.printTemplate.paperWidth")}
              <select
                className={fieldClass}
                value={draft.paperWidth}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    paperWidth: event.target.value as PrintPaperWidth,
                  }))
                }
              >
                <option value="MM58">58mm</option>
                <option value="MM80">80mm</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              {t("settings.printTemplate.location")}
              <select
                className={fieldClass}
                value={draft.locationScope}
                disabled={Boolean(draft.id)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    locationScope: event.target.value as Draft["locationScope"],
                  }))
                }
              >
                <option value="CURRENT">{t("settings.printTemplate.currentBranch")}</option>
                <option value="ALL">{t("settings.printTemplate.allOutlets")}</option>
              </select>
              {draft.id ? (
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {t("settings.printTemplate.lockedLocation")}
                </span>
              ) : null}
            </label>
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">{t("settings.printTemplate.header")}</h3>
          <ToggleField
            label={t("settings.printTemplate.outletName")}
            checked={settings.header.outletName}
            onChange={(outletName) =>
              patchSettings({ ...settings, header: { ...settings.header, outletName } })
            }
          />
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">{t("settings.printTemplate.item")}</h3>
          <label className="block py-2 text-sm text-slate-700">
            {t("settings.printTemplate.fontSize")}
            <select
              className={fieldClass}
              value={settings.item.fontSize}
              onChange={(event) =>
                patchSettings({
                  ...settings,
                  item: { ...settings.item, fontSize: event.target.value },
                })
              }
            >
              <option value="SMALL">{t("settings.printTemplate.small")}</option>
              <option value="MIDDLE">{t("settings.printTemplate.middle")}</option>
              <option value="LARGE">{t("settings.printTemplate.large")}</option>
            </select>
          </label>
          {(
            [
              ["qtyFirst", "qtyFirst"],
              ["price", "price"],
              ["modifiers", "modifiers"],
              ["categorySubtotal", "categorySubtotal"],
            ] as const
          ).map(([field, label]) => (
            <ToggleField
              key={field}
              label={t(`settings.printTemplate.${label}`)}
              checked={settings.item[field]}
              onChange={(checked) =>
                patchSettings({
                  ...settings,
                  item: {
                    ...settings.item,
                    [field]: checked,
                    ...(field === "price" ? { hidePriceOnOrderBill: !checked } : {}),
                  },
                })
              }
            />
          ))}
        </section>

        {draft.type === "KITCHEN" ? null : (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">{t("settings.printTemplate.bill")}</h3>
          {billFields.map((field) => (
            <ToggleField
              key={field}
              label={t(`settings.printTemplate.${field}`)}
              checked={settings.bill[field]}
              onChange={(checked) =>
                patchSettings({
                  ...settings,
                  bill: { ...settings.bill, [field]: checked },
                })
              }
            />
          ))}
        </section>
        )}

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">{t("settings.printTemplate.other")}</h3>
          {otherFields.map((field) => (
            <ToggleField
              key={field}
              label={t(`settings.printTemplate.${field}`)}
              checked={settings.other[field]}
              onChange={(checked) =>
                patchSettings({
                  ...settings,
                  other: { ...settings.other, [field]: checked },
                })
              }
            />
          ))}
          <label className="block py-2 text-sm text-slate-700">
            {t("settings.printTemplate.footerText")}
            <input
              className={fieldClass}
              value={settings.other.footerText}
              onChange={(event) =>
                patchSettings({
                  ...settings,
                  other: { ...settings.other, footerText: event.target.value },
                })
              }
            />
          </label>
        </section>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" isLoading={isLoading}>
            {t("settings.printTemplate.save")}
          </Button>
          {draft.id ? (
            <Button type="button" variant="outline" onClick={() => void remove()}>
              {t("settings.printTemplate.delete")}
            </Button>
          ) : null}
        </div>
      </div>
      <aside className="rounded-xl bg-slate-100 p-4">
        <p className="mb-3 text-sm font-semibold text-slate-600">
          {t("settings.printTemplate.previewTitle")}
        </p>
        <ReceiptPreview
          settings={settings}
          paperWidth={draft.paperWidth}
          type={draft.type}
        />
      </aside>
    </form>
  );
}
