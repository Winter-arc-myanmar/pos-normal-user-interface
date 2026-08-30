import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  CreateWaitlistEntryDTO,
  WaitlistStatus,
} from "@/core/application/dtos/CashierDTO";
import { WaitlistEntry } from "@/core/domain/entities/Cashier";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCashier } from "@/core/presentation/hooks/useCashier";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useDateFormatter } from "@/lib/i18n/formatters";

type StatusTab = WaitlistStatus;

const statusTabs: StatusTab[] = [
  "WAITING",
  "NOTIFIED",
  "SEATED",
  "CANCELED",
  "NO_SHOW",
];

const fieldClass =
  "min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

const emptyForm = {
  guestName: "",
  guestPhone: "",
  partySize: "2",
  estimatedWaitMins: "15",
  preferredZoneId: "",
  notes: "",
};

function formatElapsedMinutes(joinedAt: string): number {
  const joined = new Date(joinedAt).getTime();
  if (Number.isNaN(joined)) return 0;
  return Math.max(0, Math.floor((Date.now() - joined) / 60_000));
}

function ListEmptyIllustration() {
  return (
    <svg
      viewBox="0 0 120 96"
      className="mx-auto h-24 w-28 text-slate-300"
      aria-hidden="true"
    >
      <rect x="18" y="28" width="84" height="52" rx="6" fill="currentColor" opacity="0.25" />
      <path
        d="M18 34 L60 58 L102 34"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M72 14 L96 8 L90 30 Z"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  );
}

function DetailEmptyIllustration() {
  return (
    <svg
      viewBox="0 0 120 96"
      className="mx-auto h-24 w-28 text-slate-500"
      aria-hidden="true"
    >
      <path
        d="M28 72 L28 36 Q28 24 40 24 L80 24 Q92 24 92 36 L92 72 Z"
        fill="currentColor"
        opacity="0.35"
      />
      <circle cx="48" cy="48" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="72" cy="48" r="3" fill="currentColor" opacity="0.6" />
      <path
        d="M46 58 Q60 66 74 58"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

export function WaitlistPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormatter();
  const { user } = useAuth();
  const { activePosRegisterId, activePosSessionId } = usePosWorkspace();
  const {
    waitlistEntries,
    diningTables,
    diningZones,
    isLoading,
    error,
    fetchWaitlist,
    fetchDiningTables,
    fetchDiningZones,
    createWaitlistEntry,
    updateWaitlistEntry,
    notifyWaitlistEntry,
    seatWaitlistEntry,
    cancelWaitlistEntry,
    noShowWaitlistEntry,
    activeLocationId,
    fetchInventoryLocations,
  } = useCashier();

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<WaitlistEntry | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("WAITING");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const tenantId = String(user?.tenantId || "");
  const locationId = activeLocationId;

  useEffect(() => {
    if (!tenantId) return;
    void fetchInventoryLocations(tenantId);
  }, [fetchInventoryLocations, tenantId]);

  useEffect(() => {
    if (!locationId) return;
    void Promise.allSettled([
      fetchWaitlist({
        page: 1,
        limit: 100,
        locationId,
        status: statusTab,
        search: search.trim() || undefined,
      }),
      fetchDiningTables({ page: 1, limit: 200, status: "AVAILABLE" }),
      fetchDiningZones(),
    ]);
  }, [
    fetchDiningTables,
    fetchDiningZones,
    fetchWaitlist,
    locationId,
    search,
    statusTab,
  ]);

  const visibleEntries = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return waitlistEntries.filter((entry) => {
      if (entry.status !== statusTab) return false;
      if (!keyword) return true;
      return [entry.guestName, entry.guestPhone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [search, statusTab, waitlistEntries]);

  const selectedEntry = useMemo(
    () => visibleEntries.find((entry) => entry.id === selectedId) ?? null,
    [selectedId, visibleEntries]
  );

  const notifiedCount = useMemo(
    () => waitlistEntries.filter((entry) => entry.status === "NOTIFIED").length,
    [waitlistEntries]
  );

  const availableTables = diningTables.filter(
    (table) => table.status === "AVAILABLE"
  );

  const zoneNameById = useMemo(
    () => new Map(diningZones.map((zone) => [zone.id, zone.name])),
    [diningZones]
  );

  useEffect(() => {
    if (selectedId && !visibleEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(null);
      setSelectedTableId("");
    }
  }, [selectedId, visibleEntries]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const beginEdit = (entry: WaitlistEntry) => {
    setEditing(entry);
    setForm({
      guestName: entry.guestName,
      guestPhone: entry.guestPhone,
      partySize: String(entry.partySize),
      estimatedWaitMins: String(entry.estimatedWaitMins || ""),
      preferredZoneId: entry.preferredZoneId || "",
      notes: entry.notes || "",
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    try {
      if (!tenantId || !locationId) {
        throw new Error(t("cashier.errors.missingContext"));
      }
      const editableFields = {
        guestName: form.guestName.trim(),
        guestPhone: form.guestPhone.trim(),
        partySize: Number(form.partySize),
        estimatedWaitMins: form.estimatedWaitMins
          ? Number(form.estimatedWaitMins)
          : undefined,
        preferredZoneId: form.preferredZoneId || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editing) {
        const updated = await updateWaitlistEntry(editing.id, editableFields);
        setSelectedId(updated.id);
      } else {
        const payload: CreateWaitlistEntryDTO = {
          tenantId,
          locationId,
          ...editableFields,
        };
        const created = await createWaitlistEntry(payload);
        setStatusTab("WAITING");
        setSelectedId(created.id);
      }
      closeForm();
      await fetchWaitlist({
        page: 1,
        limit: 100,
        locationId,
        status: statusTab,
        search: search.trim() || undefined,
      });
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.waitlist.saveFailed")
      );
    }
  };

  const runAction = async (action: () => Promise<unknown>) => {
    setLocalError(null);
    try {
      await action();
      if (locationId) {
        await fetchWaitlist({
          page: 1,
          limit: 100,
          locationId,
          status: statusTab,
          search: search.trim() || undefined,
        });
      }
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.waitlist.actionFailed")
      );
    }
  };

  const statusLabel = (status: WaitlistStatus) => {
    const key = {
      WAITING: "waiting",
      NOTIFIED: "notified",
      SEATED: "seated",
      CANCELED: "canceled",
      NO_SHOW: "noShow",
    }[status];
    return t(`cashier.waitlist.tabs.${key}`);
  };

  const isActionable = (entry: WaitlistEntry) =>
    entry.status === "WAITING" || entry.status === "NOTIFIED";

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] overflow-hidden bg-slate-100">
      <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
        <header className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              {t("cashier.waitlistTitle")}
            </h1>
            <Button size="sm" onClick={openCreateForm}>
              {t("cashier.waitlist.addParty")}
            </Button>
          </div>
          <div className="mt-3">
            <SearchInput
              aria-label={t("cashier.waitlist.search")}
              placeholder={t("cashier.waitlist.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {t("cashier.waitingCount", { count: visibleEntries.length })}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {visibleEntries.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
              <ListEmptyIllustration />
              <p className="mt-4 text-sm text-slate-500">
                {t("cashier.waitlistEmpty")}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {visibleEntries.map((entry) => {
                const isSelected = entry.id === selectedId;
                const elapsed = formatElapsedMinutes(entry.joinedAt);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      aria-label={entry.guestName}
                      onClick={() => {
                        setSelectedId(entry.id);
                        setSelectedTableId("");
                      }}
                      className={[
                        "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {entry.guestName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {entry.guestPhone}
                          </p>
                        </div>
                        <span className="shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {t("cashier.partySize")} {entry.partySize}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {t("cashier.waitlist.waited", { minutes: elapsed })}
                        {entry.estimatedWaitMins
                          ? ` · ${t("cashier.waitlist.estimated", {
                              minutes: entry.estimatedWaitMins,
                            })}`
                          : null}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <main className="flex min-h-0 flex-col bg-slate-950 text-slate-100">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusTab(tab);
                  setSelectedId(null);
                  setSelectedTableId("");
                }}
                className={[
                  "relative min-h-9 rounded-full px-4 text-xs font-semibold transition-colors",
                  statusTab === tab
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white",
                ].join(" ")}
              >
                {statusLabel(tab)}
                {tab === "NOTIFIED" && notifiedCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                ) : null}
              </button>
            ))}
          </div>
        </header>

        {(error || localError) && (
          <p className="mx-4 mt-3 rounded bg-red-950/60 p-3 text-sm text-red-200">
            {localError || error}
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col p-4">
          {!selectedEntry ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <DetailEmptyIllustration />
              <p className="mt-4 text-sm text-slate-400">
                {visibleEntries.length === 0
                  ? t("cashier.waitlist.noGuests")
                  : t("cashier.waitlist.selectGuest")}
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{selectedEntry.guestName}</h2>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                      {statusLabel(selectedEntry.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedEntry.guestPhone}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => beginEdit(selectedEntry)}
                >
                  {t("cashier.waitlist.editParty")}
                </Button>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    {t("cashier.partySize")}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {selectedEntry.partySize}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    {t("cashier.waitlist.joinedAt")}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatDateTime(selectedEntry.joinedAt)}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    {t("cashier.waitlist.waitTime")}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {t("cashier.waitlist.waited", {
                      minutes: formatElapsedMinutes(selectedEntry.joinedAt),
                    })}
                  </dd>
                </div>
                {selectedEntry.estimatedWaitMins ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      {t("cashier.waitlist.estimatedWait")}
                    </dt>
                    <dd className="mt-1 text-sm">
                      {t("cashier.waitlist.estimated", {
                        minutes: selectedEntry.estimatedWaitMins,
                      })}
                    </dd>
                  </div>
                ) : null}
                {selectedEntry.preferredZoneId ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      {t("cashier.waitlist.preferredZone")}
                    </dt>
                    <dd className="mt-1 text-sm">
                      {zoneNameById.get(selectedEntry.preferredZoneId) ||
                        selectedEntry.preferredZoneId}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {selectedEntry.notes ? (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {t("cashier.waitlist.notes")}
                  </p>
                  <p className="mt-2 text-sm text-slate-200">{selectedEntry.notes}</p>
                </div>
              ) : null}

              {isActionable(selectedEntry) ? (
                <div className="mt-auto space-y-3 border-t border-slate-800 pt-4">
                  <select
                    aria-label={t("cashier.waitlist.tableFor", {
                      guest: selectedEntry.guestName,
                    })}
                    className={`${fieldClass} border-slate-700`}
                    value={selectedTableId}
                    onChange={(event) => setSelectedTableId(event.target.value)}
                  >
                    <option value="">{t("cashier.waitlist.chooseTable")}</option>
                    {availableTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.tableNumber} ({table.maxSeats})
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.status === "WAITING" ? (
                      <Button
                        variant="secondary"
                        isLoading={isLoading}
                        onClick={() =>
                          void runAction(() => notifyWaitlistEntry(selectedEntry.id))
                        }
                      >
                        {t("cashier.notify")}
                      </Button>
                    ) : null}
                    <Button
                      isLoading={isLoading}
                      disabled={!selectedTableId}
                      onClick={() =>
                        void runAction(() =>
                          seatWaitlistEntry(selectedEntry.id, {
                            tableId: selectedTableId,
                            guestCount: selectedEntry.partySize,
                            posRegisterId: activePosRegisterId || undefined,
                            openedByPosSessionId: activePosSessionId || undefined,
                          })
                        )
                      }
                    >
                      {t("cashier.seat")}
                    </Button>
                    <Button
                      variant="outline"
                      isLoading={isLoading}
                      onClick={() =>
                        void runAction(() => cancelWaitlistEntry(selectedEntry.id))
                      }
                    >
                      {t("cashier.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      isLoading={isLoading}
                      onClick={() =>
                        void runAction(() => noShowWaitlistEntry(selectedEntry.id))
                      }
                    >
                      {t("cashier.noShow")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">
              {editing
                ? t("cashier.waitlist.editParty")
                : t("cashier.waitlist.addParty")}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                aria-label={t("cashier.waitlist.guestName")}
                required
                placeholder={t("cashier.waitlist.guestName")}
                className={fieldClass}
                value={form.guestName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    guestName: event.target.value,
                  }))
                }
              />
              <input
                aria-label={t("cashier.waitlist.guestPhone")}
                required
                placeholder={t("cashier.waitlist.guestPhone")}
                className={fieldClass}
                value={form.guestPhone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    guestPhone: event.target.value,
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  {t("cashier.partySize")}
                  <input
                    aria-label={t("cashier.partySize")}
                    required
                    type="number"
                    min={1}
                    className={`${fieldClass} mt-1`}
                    value={form.partySize}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        partySize: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  {t("cashier.waitlist.estimatedWait")}
                  <input
                    aria-label={t("cashier.waitlist.estimatedWait")}
                    type="number"
                    min={0}
                    className={`${fieldClass} mt-1`}
                    value={form.estimatedWaitMins}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        estimatedWaitMins: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <select
                aria-label={t("cashier.waitlist.preferredZone")}
                className={fieldClass}
                value={form.preferredZoneId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    preferredZoneId: event.target.value,
                  }))
                }
              >
                <option value="">{t("cashier.waitlist.anyZone")}</option>
                {diningZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
              <textarea
                aria-label={t("cashier.waitlist.notes")}
                placeholder={t("cashier.waitlist.notes")}
                className={`${fieldClass} min-h-24 py-3`}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
              <div className="flex gap-2 pt-1">
                <Button fullWidth type="submit" isLoading={isLoading}>
                  {editing
                    ? t("cashier.waitlist.saveParty")
                    : t("cashier.waitlist.addParty")}
                </Button>
                <Button fullWidth variant="outline" type="button" onClick={closeForm}>
                  {t("cashier.cancel")}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
