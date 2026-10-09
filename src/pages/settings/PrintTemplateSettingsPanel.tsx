import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { SlipPreview } from "@/components/printing/SlipPreview";
import {
  PriceCurrency,
  PrintCompany,
  PrintPaperWidth,
  PrintTemplateSettings,
  PrintTemplateType,
  defaultPrintTemplateSettings,
} from "@/core/domain/entities/PrintTemplate";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { printCompanyFor } from "@/core/presentation/hooks/usePrinterConnection";
import { useVenueSetting } from "@/core/presentation/hooks/useVenueSetting";
import { usePrintTemplateManagement } from "@/core/presentation/hooks/usePrintTemplateManagement";
import {
  PrintLine,
  PrintPlace,
  kitchenSlipPreview,
  saleReceiptPreview,
} from "@/lib/printing/formatKdsTicket";
import {
  printPlaceToTemplateType,
  templateTypeToPrintPlace,
  templatesForPrintPlace,
} from "@/lib/printing/selectPrintTemplate";

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

const DEFAULT_NAMES: Record<PrintTemplateType, string> = {
  RECEIPT: "Default receipt",
  KITCHEN: "Default kitchen",
  FINANCE: "Default finance",
};

const emptyDraft = (): Draft => ({
  id: "",
  name: DEFAULT_NAMES.RECEIPT,
  locationScope: "CURRENT",
  type: "RECEIPT",
  paperWidth: "MM80",
  isDefault: true,
  settings: defaultPrintTemplateSettings(),
});

const isPresetName = (name: string) =>
  Object.values(DEFAULT_NAMES).includes(name.trim());

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

const sampleTime = (hours: number, minutes: number) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const SAMPLE_LINES: PrintLine[] = [
  {
    name: "KTV room 2 hours",
    altName: "KTV အခန်း ၂ နာရီ",
    quantity: "2",
    unitPrice: "25000",
    categoryName: "Rooms",
  },
  {
    name: "Fried rice",
    altName: "ထမင်းကြော်",
    quantity: "1",
    unitPrice: "6500",
    modifiers: "Extra egg",
    modifierPrices: "500",
    remarks: "No chili",
    categoryName: "Food",
    seat: "2",
  },
];

/** A sample bill drawn by the same code that prints, so the preview is the paper. */
function TemplatePreview({
  settings,
  paperWidth,
  type,
  outletName,
  company,
  currency,
}: {
  settings: PrintTemplateSettings;
  paperWidth: PrintPaperWidth;
  type: PrintTemplateType;
  outletName: string;
  company: PrintCompany | null;
  currency?: PriceCurrency;
}) {
  const slip =
    type === "KITCHEN"
      ? kitchenSlipPreview({
          title: "0012",
          stationName: "Kitchen",
          place: "KTV K3",
          placeDetail: "VIP - 4 guests",
          orderRef: "SO-R01-0012",
          firedAt: sampleTime(14, 5),
          sentBy: "Aung Aung",
          outletName,
          lines: SAMPLE_LINES.slice(1).concat({ name: "Lime juice", quantity: "2", unitPrice: "2500" }),
          template: settings,
          paperWidth,
        })
      : saleReceiptPreview({
          title: type === "FINANCE" ? "Finance copy" : "Receipt",
          place: type === "FINANCE" ? "FINANCE" : "CHECKOUT",
          receiptId: "SO-R01-0012",
          paidAt: sampleTime(14, 31),
          company,
          outletName,
          serviceType: "KTV",
          tableOrRoom: "K3",
          startTime: "13:00",
          endTime: "14:30",
          cashier: "Aung Aung",
          pickupCode: "A12",
          lines: SAMPLE_LINES,
          subtotal: "56500",
          discount: "2825",
          total: "53675",
          payments: [{ name: "Cash", amount: "60000" }],
          change: "6325",
          template: settings,
          paperWidth,
          currency,
        });
  return <SlipPreview slip={slip} />;
}

export function PrintTemplateSettingsPanel() {
  const { t } = useTranslation();
  const { activeLocationId } = usePosWorkspace();
  const { user } = useAuth();
  const { currency } = useVenueSetting();
  const [company, setCompany] = useState<PrintCompany | null>(null);
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

  useEffect(() => {
    if (!user?.tenantId) return;
    let cancelled = false;
    void printCompanyFor(user.tenantId).then((found) => {
      if (!cancelled) setCompany(found);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.tenantId]);

  const patchSettings = (settings: PrintTemplateSettings) =>
    setDraft((current) => ({ ...current, settings }));

  const applyType = (type: PrintTemplateType) => {
    setDraft((current) => {
      if (current.id) return current;
      const settings = defaultPrintTemplateSettings();
      if (type === "KITCHEN") {
        settings.item.price = false;
        settings.header.logo = false;
      }
      if (type === "FINANCE") {
        settings.header.logo = false;
      }
      return {
        ...current,
        type,
        isDefault: true,
        name: isPresetName(current.name) ? DEFAULT_NAMES[type] : current.name,
        settings,
      };
    });
  };

  const place = templateTypeToPrintPlace(draft.type);
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
  const billFields = ["amountAfterDiscount", "totalPayment", "payTime"] as const;

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
                        : t("settings.printTemplate.builtin"))}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {competing.length > 1
                      ? t("settings.printTemplate.conflict", {
                          name: competing.map((template) => template.name).join(", "),
                        })
                      : competing.length === 1
                        ? t("settings.printTemplate.printingNow")
                        : t("settings.printTemplate.usingBuiltin")}
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
                    {template.name} — {placeCopy[templateTypeToPrintPlace(template.type)].label}
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
                  const selected = place === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={selected}
                      disabled={Boolean(draft.id) && !selected}
                      onClick={() => applyType(printPlaceToTemplateType(item))}
                      className={[
                        "rounded-lg border px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50",
                        selected
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
                          selected ? "text-blue-100" : "text-slate-500",
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
                  {t("settings.printTemplate.lockedType")}
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
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isDefault: event.target.checked,
                  }))
                }
              />
              {t("settings.printTemplate.defaultStatus")}
            </label>
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">{t("settings.printTemplate.header")}</h3>
          <ToggleField
            label={t("settings.printTemplate.logo")}
            checked={settings.header.logo}
            onChange={(logo) =>
              patchSettings({ ...settings, header: { ...settings.header, logo } })
            }
          />
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
        <TemplatePreview
          settings={settings}
          paperWidth={draft.paperWidth}
          type={draft.type}
          outletName={t("settings.printTemplate.previewOutlet")}
          company={company}
          currency={currency}
        />
        <p className="mt-3 text-xs text-slate-500">{t("settings.printTemplate.previewHint")}</p>
      </aside>
    </form>
  );
}
