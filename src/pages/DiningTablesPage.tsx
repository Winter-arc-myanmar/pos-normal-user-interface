import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  DiningTableShape,
  DiningTableStatus,
} from "@/core/application/dtos/CashierDTO";
import { DiningTable } from "@/core/domain/entities/Cashier";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useDiningTableManagement } from "@/core/presentation/hooks/useDiningTableManagement";

const TILE = 96;
const GAP = 16;
const STATUSES: DiningTableStatus[] = ["AVAILABLE", "OCCUPIED", "DIRTY", "RESERVED"];
const SHAPES: DiningTableShape[] = ["RECTANGLE", "CIRCLE"];

const fieldClass =
  "mt-1 min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500";

type Draft = {
  id: string;
  zoneId: string;
  tableNumber: string;
  maxSeats: string;
  posX: string;
  posY: string;
  shape: DiningTableShape;
  status: DiningTableStatus;
};

const emptyDraft = (zoneId = ""): Draft => ({
  id: "",
  zoneId,
  tableNumber: "",
  maxSeats: "4",
  posX: "40",
  posY: "40",
  shape: "RECTANGLE",
  status: "AVAILABLE",
});

const statusTone: Record<DiningTableStatus, string> = {
  AVAILABLE: "border-emerald-500/70 bg-emerald-950/50 text-emerald-50",
  OCCUPIED: "border-sky-300 bg-white text-slate-900",
  DIRTY: "border-amber-400 bg-amber-950/60 text-amber-50",
  RESERVED: "border-violet-400 bg-violet-950/60 text-violet-50",
};

function storedPoint(table: DiningTable) {
  return { x: Number(table.posX || 0), y: Number(table.posY || 0) };
}

function displayPoint(table: DiningTable, index: number) {
  const point = storedPoint(table);
  if (point.x === 0 && point.y === 0) {
    return {
      x: (index % 4) * (TILE + GAP) + GAP,
      y: Math.floor(index / 4) * (TILE + GAP) + GAP,
    };
  }
  return point;
}

function seatedDuration(openedAt: string, now: number) {
  const started = Date.parse(openedAt);
  if (!Number.isFinite(started)) return "";
  const minutes = Math.max(0, Math.floor((now - started) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

export function DiningTablesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    tables,
    zones,
    page,
    totalPages,
    total,
    isLoading,
    error,
    listZones,
    listTables,
    createTable,
    updateTable,
    changeStatus,
    deleteTable,
  } = useDiningTableManagement();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [search, setSearch] = useState("");
  const [zoneId, setZoneId] = useState("ALL");
  const [status, setStatus] = useState<"ALL" | DiningTableStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [live, setLive] = useState<{ id: string; x: number; y: number } | null>(null);
  const [placed, setPlaced] = useState<Record<string, { x: number; y: number }>>({});
  const [now, setNow] = useState(() => Date.now());
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    originX: number;
    originY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const skipClickRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void listZones().catch(() => undefined);
  }, [listZones]);

  useEffect(() => {
    void listTables({
      page: currentPage,
      limit: 48,
      search: search.trim() || undefined,
      zoneId: zoneId === "ALL" ? undefined : zoneId,
      status: status === "ALL" ? undefined : status,
      sortBy: "tableNumber",
      sortOrder: "asc",
    }).catch(() => undefined);
  }, [currentPage, listTables, search, status, zoneId]);

  const zoneName = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone.name])),
    [zones]
  );

  const pointFor = (table: DiningTable, index: number) => {
    if (live?.id === table.id) return { x: live.x, y: live.y };
    return placed[table.id] || displayPoint(table, index);
  };

  const selectTable = (table: DiningTable) => {
    setPlacing(false);
    setConfirmDelete(false);
    setNotice(null);
    setDraft({
      id: table.id,
      zoneId: table.zoneId,
      tableNumber: table.tableNumber,
      maxSeats: String(table.maxSeats || 1),
      posX: String(Number(table.posX || 0)),
      posY: String(Number(table.posY || 0)),
      shape: table.shape === "CIRCLE" ? "CIRCLE" : "RECTANGLE",
      status: table.status,
    });
  };

  const startCreate = () => {
    const occupied = tables.map((table, index) => pointFor(table, index));
    const nextX = Math.max(GAP, ...occupied.map((point) => point.x + TILE + GAP), GAP);
    setPlacing(true);
    setConfirmDelete(false);
    setNotice(null);
    setDraft({
      ...emptyDraft(zoneId === "ALL" ? zones[0]?.id || "" : zoneId),
      posX: String(nextX),
      posY: String(GAP),
    });
  };

  const beginDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
    originX: number,
    originY: number
  ) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      originX,
      originY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (!drag.moved) return;
    setLive({
      id: drag.id,
      x: Math.max(0, Math.round(drag.originX + dx)),
      y: Math.max(0, Math.round(drag.originY + dy)),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) {
      setLive(null);
      return;
    }
    skipClickRef.current = true;
    const next = {
      x: Math.max(0, Math.round(drag.originX + (event.clientX - drag.startX))),
      y: Math.max(0, Math.round(drag.originY + (event.clientY - drag.startY))),
    };
    setLive(null);
    if (!drag.id) {
      setDraft((current) => ({
        ...current,
        posX: String(next.x),
        posY: String(next.y),
      }));
      return;
    }
    setPlaced((current) => ({ ...current, [drag.id]: next }));
    setDraft((current) =>
      current.id === drag.id
        ? { ...current, posX: String(next.x), posY: String(next.y) }
        : current
    );
    void updateTable(drag.id, { posX: next.x, posY: next.y })
      .then((updated) => {
        setDraft((current) =>
          current.id === updated.id
            ? {
                ...current,
                posX: String(Number(updated.posX || next.x)),
                posY: String(Number(updated.posY || next.y)),
              }
            : current
        );
        setPlaced((current) => {
          const nextPlaced = { ...current };
          delete nextPlaced[updated.id];
          return nextPlaced;
        });
        setNotice(t("diningTables.moved"));
      })
      .catch(() => {
        setPlaced((current) => {
          const nextPlaced = { ...current };
          delete nextPlaced[drag.id];
          return nextPlaced;
        });
        setNotice(null);
      });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      zoneId: draft.zoneId,
      tableNumber: draft.tableNumber.trim(),
      maxSeats: Number(draft.maxSeats),
      posX: Number(draft.posX || 0),
      posY: Number(draft.posY || 0),
      shape: draft.shape,
      status: draft.status,
    };
    try {
      if (draft.id) {
        const updated = await updateTable(draft.id, payload);
        selectTable(updated);
      } else {
        const created = await createTable({
          tenantId: String(user?.tenantId || ""),
          ...payload,
        });
        selectTable(created);
      }
      setNotice(t("diningTables.saved"));
    } catch {
      setNotice(null);
    }
  };

  const applyStatus = async (next: DiningTableStatus) => {
    if (!draft.id) {
      setDraft((current) => ({ ...current, status: next }));
      return;
    }
    try {
      const updated = await changeStatus(draft.id, next);
      selectTable(updated);
      setNotice(t("diningTables.statusSaved"));
    } catch {
      setNotice(null);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    try {
      await deleteTable(draft.id);
      setDraft(emptyDraft(zones[0]?.id || ""));
      setConfirmDelete(false);
      setNotice(t("diningTables.deleted"));
    } catch {
      setNotice(null);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080808] text-slate-100 min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,1.45fr)_minmax(20rem,24rem)] min-[1100px]:grid-rows-[auto_minmax(0,1fr)] min-[1100px]:gap-3 min-[1100px]:p-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 min-[1100px]:contents">
      <header className="flex min-w-0 flex-wrap items-center gap-2 min-[1100px]:col-span-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">{t("diningTables.title")}</h1>
          <p className="text-xs text-slate-400">
            {t("diningTables.subtitle", { count: total })}
          </p>
        </div>
        <div className="w-full min-w-0 sm:w-64">
          <SearchInput
            aria-label={t("diningTables.search")}
            placeholder={t("diningTables.search")}
            value={search}
            onChange={(event) => {
              setCurrentPage(1);
              setSearch(event.target.value);
            }}
            onClear={() => setSearch("")}
          />
        </div>
        <Button type="button" onClick={startCreate}>
          {t("diningTables.add")}
        </Button>
      </header>

      <div className="flex h-80 shrink-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#101010] min-[1100px]:h-full min-[1100px]:min-h-0">
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-800 p-2">
          <FilterChip
            active={zoneId === "ALL"}
            label={t("diningTables.allZones")}
            onClick={() => {
              setCurrentPage(1);
              setZoneId("ALL");
            }}
          />
          {zones.map((zone) => (
            <FilterChip
              key={zone.id}
              active={zoneId === zone.id}
              label={zone.name}
              onClick={() => {
                setCurrentPage(1);
                setZoneId(zone.id);
              }}
            />
          ))}
        </div>
        <div className="flex shrink-0 gap-2 overflow-x-auto px-2 py-2">
          <FilterChip
            active={status === "ALL"}
            label={t("diningTables.allStatuses")}
            onClick={() => {
              setCurrentPage(1);
              setStatus("ALL");
            }}
          />
          {STATUSES.map((item) => (
            <FilterChip
              key={item}
              active={status === item}
              label={t(`diningTables.status.${item}`)}
              onClick={() => {
                setCurrentPage(1);
                setStatus(item);
              }}
            />
          ))}
        </div>
        {error ? (
          <p className="mx-2 rounded bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
        ) : null}
        <p className="px-3 text-xs text-slate-500">{t("diningTables.dragHint")}</p>
        <div className="relative m-2 min-h-0 flex-1 overflow-auto rounded-lg bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.18)_1px,transparent_0)] [background-size:18px_18px]">
          {isLoading && tables.length === 0 ? (
            <ApiLoadingState label={t("diningTables.loading")} />
          ) : tables.length === 0 && !placing ? (
            <p className="p-6 text-sm text-slate-400">{t("diningTables.empty")}</p>
          ) : (
            <div
              className="relative min-h-full min-w-full"
              style={{
                width: Math.max(
                  ...tables.map((table, index) => pointFor(table, index).x),
                  placing ? Number(draft.posX || 0) : 0,
                  live && !live.id ? live.x : 0
                ) + TILE + GAP * 2,
                height: Math.max(
                  ...tables.map((table, index) => pointFor(table, index).y),
                  placing ? Number(draft.posY || 0) : 0,
                  live && !live.id ? live.y : 0,
                  240
                ) + TILE + GAP * 2,
              }}
            >
              {tables.map((table, index) => {
                const point = pointFor(table, index);
                const selected = draft.id === table.id;
                const seated = table.activeSession?.openedAt
                  ? seatedDuration(table.activeSession.openedAt, now)
                  : "";
                return (
                  <button
                    key={table.id}
                    type="button"
                    style={{ left: point.x, top: point.y }}
                    onPointerDown={(event) => beginDrag(event, table.id, point.x, point.y)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={() => {
                      if (skipClickRef.current) {
                        skipClickRef.current = false;
                        return;
                      }
                      selectTable(table);
                    }}
                    className={[
                      "absolute flex h-24 w-24 touch-none cursor-grab flex-col justify-between border p-2 text-left shadow-lg active:cursor-grabbing",
                      table.shape === "CIRCLE" ? "rounded-full" : "rounded-xl",
                      statusTone[table.status] || statusTone.AVAILABLE,
                      selected ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-[#101010]" : "",
                    ].join(" ")}
                  >
                    <span className="truncate text-sm font-bold">{table.tableNumber}</span>
                    <span className="text-[11px] leading-tight">
                      {t("diningTables.seats", { count: table.maxSeats })}
                      {table.activeSession
                        ? ` · ${t("diningTables.guests", { count: table.activeSession.guestCount })}`
                        : ""}
                    </span>
                    <span className="truncate text-[10px] opacity-80">
                      {table.activeSession
                        ? t("diningTables.seated", {
                            duration: seated,
                            items: table.activeSession.itemCount,
                          })
                        : t(`diningTables.status.${table.status}`)}
                    </span>
                  </button>
                );
              })}
              {placing && !draft.id ? (
                <button
                  type="button"
                  style={{
                    left: live && !live.id ? live.x : Number(draft.posX || 0),
                    top: live && !live.id ? live.y : Number(draft.posY || 0),
                  }}
                  onPointerDown={(event) =>
                    beginDrag(
                      event,
                      "",
                      live && !live.id ? live.x : Number(draft.posX || 0),
                      live && !live.id ? live.y : Number(draft.posY || 0)
                    )
                  }
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute flex h-24 w-24 touch-none cursor-grab flex-col justify-between rounded-xl border border-dashed border-blue-400 bg-blue-950/70 p-2 text-left text-blue-50 active:cursor-grabbing"
                >
                  <span className="truncate text-sm font-bold">
                    {draft.tableNumber || t("diningTables.create")}
                  </span>
                  <span className="text-[11px]">{t("diningTables.dragHint")}</span>
                </button>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-800 px-3 py-2 text-sm">
          <button
            type="button"
            className="min-h-9 min-w-9 rounded bg-slate-800 disabled:opacity-40"
            disabled={page <= 1 || isLoading}
            onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
            aria-label={t("diningTables.prevPage")}
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
            aria-label={t("diningTables.nextPage")}
          >
            ›
          </button>
        </div>
      </div>

      <form
        id="dining-table-form"
        onSubmit={(event) => void save(event)}
        className="shrink-0 rounded-xl border border-slate-800 bg-slate-950 p-4 min-[1100px]:min-h-0 min-[1100px]:overflow-y-auto"
      >
        <h2 className="text-base font-semibold">
          {draft.id ? t("diningTables.edit") : t("diningTables.create")}
        </h2>
        {notice ? <p className="mt-2 text-sm text-emerald-300">{notice}</p> : null}
        <label className="mt-3 block text-xs text-slate-400">
          {t("diningTables.zone")}
          <select
            required
            className={fieldClass}
            value={draft.zoneId}
            onChange={(event) =>
              setDraft((current) => ({ ...current, zoneId: event.target.value }))
            }
          >
            <option value="">{t("diningTables.chooseZone")}</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs text-slate-400">
          {t("diningTables.number")}
          <input
            required
            className={fieldClass}
            value={draft.tableNumber}
            onChange={(event) =>
              setDraft((current) => ({ ...current, tableNumber: event.target.value }))
            }
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            {t("diningTables.maxSeats")}
            <input
              required
              type="number"
              min={1}
              className={fieldClass}
              value={draft.maxSeats}
              onChange={(event) =>
                setDraft((current) => ({ ...current, maxSeats: event.target.value }))
              }
            />
          </label>
          <label className="text-xs text-slate-400">
            {t("diningTables.shape")}
            <select
              className={fieldClass}
              value={draft.shape}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  shape: event.target.value as DiningTableShape,
                }))
              }
            >
              {SHAPES.map((shape) => (
                <option key={shape} value={shape}>
                  {t(`diningTables.shapeOption.${shape}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("diningTables.dragHint")}</p>
        <p className="mt-4 text-xs text-slate-400">{t("diningTables.statusLabel")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => void applyStatus(item)}
              className={[
                "min-h-9 rounded-full px-3 text-xs",
                draft.status === item ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200",
              ].join(" ")}
            >
              {t(`diningTables.status.${item}`)}
            </button>
          ))}
        </div>
        {draft.id && zoneName.get(draft.zoneId) ? (
          <p className="mt-3 text-xs text-slate-500">
            {t("diningTables.zoneHint", { zone: zoneName.get(draft.zoneId) })}
          </p>
        ) : null}
        <div className="mt-4 hidden gap-2 min-[1100px]:flex">
          <Button type="submit" isLoading={isLoading} fullWidth>
            {t("common.save")}
          </Button>
          {draft.id ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
            >
              {confirmDelete ? t("diningTables.confirmDelete") : t("common.delete")}
            </Button>
          ) : null}
        </div>
      </form>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-slate-800 bg-slate-950 p-3 min-[1100px]:hidden">
        <Button type="submit" form="dining-table-form" isLoading={isLoading} fullWidth>
          {t("common.save")}
        </Button>
        {draft.id ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
          >
            {confirmDelete ? t("diningTables.confirmDelete") : t("common.delete")}
          </Button>
        ) : null}
      </div>
    </section>
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
