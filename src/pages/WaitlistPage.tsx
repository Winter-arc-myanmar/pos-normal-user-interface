import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  CreateWaitlistEntryDTO,
  WaitlistStatus,
} from "@/core/application/dtos/CashierDTO";
import { WaitlistEntry } from "@/core/domain/entities/Cashier";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCashier } from "@/core/presentation/hooks/useCashier";

const activeStatuses: Array<"ALL" | WaitlistStatus> = [
  "ALL",
  "WAITING",
  "NOTIFIED",
  "SEATED",
  "CANCELED",
  "NO_SHOW",
];

const fieldClass =
  "min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500";

const emptyForm = {
  guestName: "",
  guestPhone: "",
  partySize: "2",
  estimatedWaitMins: "15",
  preferredZoneId: "",
  notes: "",
};

export function WaitlistPage() {
  const { user } = useAuth();
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
  const [status, setStatus] = useState<"ALL" | WaitlistStatus>("ALL");
  const [search, setSearch] = useState("");
  const [tableByEntry, setTableByEntry] = useState<Record<string, string>>({});
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
      fetchWaitlist({ page: 1, limit: 100, locationId }),
      fetchDiningTables({ page: 1, limit: 200, status: "AVAILABLE" }),
      fetchDiningZones(),
    ]);
  }, [fetchDiningTables, fetchDiningZones, fetchWaitlist, locationId]);

  const visibleEntries = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return waitlistEntries.filter((entry) => {
      const statusMatches = status === "ALL" || entry.status === status;
      const searchMatches =
        !keyword ||
        [entry.guestName, entry.guestPhone]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      return statusMatches && searchMatches;
    });
  }, [search, status, waitlistEntries]);

  const availableTables = diningTables.filter(
    (table) => table.status === "AVAILABLE"
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
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
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    try {
      if (!tenantId || !locationId) {
        throw new Error("Select a tenant branch before managing the waitlist");
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
        await updateWaitlistEntry(editing.id, editableFields);
      } else {
        const payload: CreateWaitlistEntryDTO = {
          tenantId,
          locationId,
          ...editableFields,
        };
        await createWaitlistEntry(payload);
      }
      resetForm();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to save waitlist entry"
      );
    }
  };

  const runAction = async (action: () => Promise<unknown>) => {
    setLocalError(null);
    try {
      await action();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Waitlist action failed"
      );
    }
  };

  return (
    <section className="grid h-full min-h-0 grid-cols-[18rem_minmax(0,1fr)] overflow-hidden bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-4"
      >
        <h1 className="text-xl font-bold">
          {editing ? "Edit party" : "Add walk-in party"}
        </h1>
        <div className="mt-4 space-y-3">
          <input
            aria-label="Guest name"
            required
            placeholder="Guest name"
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
            aria-label="Guest phone"
            required
            placeholder="Phone"
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
              Party size
              <input
                aria-label="Party size"
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
              Wait minutes
              <input
                aria-label="Wait minutes"
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
            aria-label="Preferred zone"
            className={fieldClass}
            value={form.preferredZoneId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                preferredZoneId: event.target.value,
              }))
            }
          >
            <option value="">Any zone</option>
            {diningZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
          <textarea
            aria-label="Notes"
            placeholder="Notes"
            className={`${fieldClass} min-h-24 py-3`}
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
          />
          <Button fullWidth type="submit" isLoading={isLoading}>
            {editing ? "Save changes" : "Add to waitlist"}
          </Button>
          {editing ? (
            <Button fullWidth variant="outline" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <main className="flex min-h-0 flex-col p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Waitlist</h2>
            <p className="text-sm text-slate-500">
              {visibleEntries.length} parties
            </p>
          </div>
          <input
            type="search"
            placeholder="Search guest or phone"
            className={`${fieldClass} max-w-64`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </header>

        <div className="my-3 flex gap-1 overflow-x-auto">
          {activeStatuses.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={[
                "min-h-10 rounded px-3 text-xs font-semibold",
                status === item
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700",
              ].join(" ")}
            >
              {item.replace("_", " ")}
            </button>
          ))}
        </div>

        {(error || localError) && (
          <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">
            {localError || error}
          </p>
        )}

        <div className="grid min-h-0 flex-1 content-start grid-cols-1 gap-2 overflow-y-auto xl:grid-cols-2">
          {visibleEntries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{entry.guestName}</h3>
                  <p className="text-xs text-slate-500">{entry.guestPhone}</p>
                </div>
                <span className="h-fit rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold">
                  {entry.status}
                </span>
              </div>
              <p className="mt-2 text-sm">
                Party {entry.partySize} · {entry.estimatedWaitMins || 0} min
              </p>

              {["WAITING", "NOTIFIED"].includes(entry.status) ? (
                <>
                  <select
                    aria-label={`Table for ${entry.guestName}`}
                    className={`${fieldClass} mt-3`}
                    value={tableByEntry[entry.id] || ""}
                    onChange={(event) =>
                      setTableByEntry((current) => ({
                        ...current,
                        [entry.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose available table</option>
                    {availableTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.tableNumber} ({table.maxSeats})
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void runAction(() => notifyWaitlistEntry(entry.id))
                      }
                    >
                      Notify
                    </Button>
                    <Button
                      size="sm"
                      disabled={!tableByEntry[entry.id]}
                      onClick={() =>
                        void runAction(() =>
                          seatWaitlistEntry(entry.id, {
                            tableId: tableByEntry[entry.id],
                            guestCount: entry.partySize,
                          })
                        )
                      }
                    >
                      Seat
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => beginEdit(entry)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        void runAction(() => cancelWaitlistEntry(entry.id))
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void runAction(() => noShowWaitlistEntry(entry.id))
                      }
                    >
                      No-show
                    </Button>
                  </div>
                </>
              ) : null}
            </article>
          ))}
        </div>
      </main>
    </section>
  );
}
