import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCategoryManagement } from "@/core/presentation/hooks/useCategoryManagement";
import { useKdsStationManagement } from "@/core/presentation/hooks/useKdsStationManagement";
import { useKitchenPrinterManagement } from "@/core/presentation/hooks/useKitchenPrinterManagement";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500";

type Draft = {
  id: string;
  name: string;
  displayColor: string;
  printerId: string;
  categoryIds: string[];
};

const emptyDraft = (): Draft => ({
  id: "",
  name: "",
  displayColor: "#2563eb",
  printerId: "",
  categoryIds: [],
});

export function KdsStationSettingsPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeLocationId } = usePosWorkspace();
  const { categories, listCategories } = useCategoryManagement();
  const { printers, listPrinters } = useKitchenPrinterManagement();
  const {
    stations,
    isLoading,
    error,
    listStations,
    createStation,
    updateStation,
    deleteStation,
  } = useKdsStationManagement();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void listCategories({ page: 1, limit: 100, sortBy: "name", sortOrder: "asc" }).catch(
      () => undefined
    );
    void listPrinters({ page: 1, limit: 100 }).catch(() => undefined);
  }, [listCategories, listPrinters]);

  useEffect(() => {
    if (!activeLocationId) return;
    void listStations({
      page: 1,
      limit: 50,
      locationId: activeLocationId,
      sortBy: "name",
      sortOrder: "asc",
    }).catch(() => undefined);
  }, [activeLocationId, listStations]);

  const categoryName = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const toggleCategory = (categoryId: string) => {
    setDraft((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  };

  const selectStation = (id: string) => {
    const station = stations.find((item) => item.id === id);
    if (!station) {
      setDraft(emptyDraft());
      return;
    }
    setDraft({
      id: station.id,
      name: station.name,
      displayColor: station.displayColor || "#2563eb",
      printerId: station.printerId || "",
      categoryIds: station.routingRules.categoryIds,
    });
    setNotice(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeLocationId || !user?.tenantId) return;
    const routingRules = { categoryIds: draft.categoryIds };
    try {
      if (draft.id) {
        await updateStation(draft.id, {
          locationId: activeLocationId,
          name: draft.name,
          displayColor: draft.displayColor,
          printerId: draft.printerId || undefined,
          routingRules,
        });
      } else {
        const created = await createStation({
          tenantId: String(user.tenantId),
          locationId: activeLocationId,
          name: draft.name,
          displayColor: draft.displayColor,
          printerId: draft.printerId || undefined,
          routingRules,
        });
        setDraft((current) => ({ ...current, id: created.id }));
      }
      setNotice(t("settings.kdsStation.saved"));
    } catch {
      setNotice(null);
    }
  };

  return (
    <form onSubmit={(event) => void save(event)} className="pos-split grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="rounded-xl bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setDraft(emptyDraft())}
          className="mb-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
        >
          {t("settings.kdsStation.newStation")}
        </button>
        {stations.map((station) => (
          <button
            key={station.id}
            type="button"
            onClick={() => selectStation(station.id)}
            className={[
              "mb-1 w-full rounded-lg px-3 py-2 text-left text-sm",
              draft.id === station.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50",
            ].join(" ")}
          >
            <span
              className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: station.displayColor || "#2563eb" }}
            />
            {station.name}
          </button>
        ))}
      </aside>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm text-slate-600">
          {t("settings.kdsStation.name")}
          <input
            className={fieldClass}
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">
            {t("settings.kdsStation.color")}
            <input
              type="color"
              className={`${fieldClass} h-11 p-1`}
              value={draft.displayColor}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  displayColor: event.target.value,
                }))
              }
            />
          </label>
          <label className="block text-sm text-slate-600">
            {t("settings.kdsStation.printer")}
            <select
              className={fieldClass}
              value={draft.printerId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, printerId: event.target.value }))
              }
            >
              <option value="">{t("settings.kdsStation.noPrinter")}</option>
              {printers.map((printer) => (
                <option key={printer.id} value={printer.id}>
                  {printer.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-800">
          {t("settings.kdsStation.categories")}
        </h3>
        <p className="mt-1 text-xs text-slate-500">{t("settings.kdsStation.categoriesHint")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              {category.name}
            </label>
          ))}
        </div>
        {draft.categoryIds.length ? (
          <p className="mt-3 text-xs text-slate-500">
            {draft.categoryIds
              .map((id) => categoryName.get(id) || id)
              .join(", ")}
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
        <div className="mt-4 flex gap-2">
          <Button type="submit" isLoading={isLoading} disabled={!draft.name.trim()}>
            {t("settings.kdsStation.save")}
          </Button>
          {draft.id ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void deleteStation(draft.id).then(() => {
                  setDraft(emptyDraft());
                  setNotice(t("settings.kdsStation.deleted"));
                });
              }}
            >
              {t("settings.kdsStation.delete")}
            </Button>
          ) : null}
        </div>
      </section>
    </form>
  );
}
