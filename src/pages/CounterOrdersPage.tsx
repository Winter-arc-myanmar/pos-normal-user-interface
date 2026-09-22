import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KdsTicketStatus } from "@/core/application/dtos/CashierDTO";
import { KdsTicket } from "@/core/domain/entities/Cashier";
import { useCashier } from "@/core/presentation/hooks/useCashier";

const PAGE_LIMIT = 50;

type QueueTab = "jobs" | KdsTicketStatus;

const queueTabs: QueueTab[] = [
  "jobs",
  "PENDING",
  "PREPARING",
  "READY",
  "EXPEDITED",
];

const statusTone: Record<KdsTicketStatus, string> = {
  PENDING: "bg-orange-500 text-white",
  PREPARING: "bg-amber-400 text-slate-950",
  READY: "bg-emerald-500 text-white",
  EXPEDITED: "bg-red-500 text-white",
};

function clockTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function shortStation(stationId?: string): string {
  if (!stationId) return "";
  return stationId.length > 8 ? stationId.slice(0, 8) : stationId;
}

export function CounterOrdersPage() {
  const { t } = useTranslation();
  const { error, listKdsTickets, getKdsTicketById } = useCashier();
  const [queue, setQueue] = useState<QueueTab>("jobs");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tickets, setTickets] = useState<KdsTicket[]>([]);
  const [stationId, setStationId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<KdsTicket | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    const result = await listKdsTickets({
      page,
      limit: PAGE_LIMIT,
      ...(stationId ? { stationId } : {}),
      ...(queue === "jobs" ? { activeOnly: true } : { status: queue }),
    });
    setTickets(result.tickets);
    setTotalPages(Math.max(1, result.totalPages || 1));
    setSelectedTicket((current) => {
      if (!current) return result.tickets[0] || null;
      return (
        result.tickets.find((ticket) => ticket.id === current.id) ||
        result.tickets[0] ||
        current
      );
    });
  }, [listKdsTickets, page, queue, stationId]);

  useEffect(() => {
    void loadTickets().catch((caught) => {
      setLocalError(
        caught instanceof Error ? caught.message : t("counterOrders.ticketsFailed")
      );
    });
  }, [loadTickets, t]);

  const stations = useMemo(() => {
    const ids = new Set<string>();
    tickets.forEach((ticket) => {
      if (ticket.stationId) ids.add(ticket.stationId);
    });
    return Array.from(ids);
  }, [tickets]);

  const unlinkedCount = tickets.filter((ticket) => !ticket.stationId).length;

  const changeQueue = (next: QueueTab) => {
    setQueue(next);
    setPage(1);
    setLocalError(null);
  };

  const printTicket = async (ticket: KdsTicket) => {
    setLocalError(null);
    try {
      const detail = ticket.id ? await getKdsTicketById(ticket.id) : ticket;
      setSelectedTicket(detail);
      window.setTimeout(() => window.print(), 50);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("counterOrders.ticketFailed")
      );
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-slate-900">
      <style>{`
          .kds-print-sheet {
            position: absolute;
            width: 0;
            height: 0;
            overflow: hidden;
          }
        @media print {
          body * { visibility: hidden; }
          .kds-print-sheet, .kds-print-sheet * { visibility: visible; }
          .kds-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            height: auto;
            overflow: visible;
            background: white;
            color: black;
          }
        }
      `}</style>

      <header className="flex items-center gap-1 border-b border-slate-200 px-3 py-2 print:hidden">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {queueTabs.map((tab) => {
            const selected = queue === tab;
            const label =
              tab === "jobs"
                ? t("counterOrders.queues.printJob", { count: tickets.length })
                : t(`counterOrders.queues.${tab.toLowerCase()}`);
            return (
              <button
                key={tab}
                type="button"
                onClick={() => changeQueue(tab)}
                className={[
                  "rounded px-3 py-1.5 text-sm",
                  selected
                    ? "font-semibold text-blue-600"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label={t("counterOrders.refresh")}
          onClick={() => {
            setLocalError(null);
            void loadTickets().catch((caught) => {
              setLocalError(
                caught instanceof Error
                  ? caught.message
                  : t("counterOrders.ticketsFailed")
              );
            });
          }}
          className="grid h-9 w-9 place-items-center rounded text-lg text-slate-500 hover:bg-slate-100"
        >
          ↻
        </button>
      </header>

      {(error || localError) && (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700 print:hidden">
          {localError || error}
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 min-[900px]:grid-cols-[14rem_minmax(0,1fr)] print:hidden">
        <aside className="border-r border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setStationId("");
              setPage(1);
            }}
            className={[
              "flex w-full items-center px-4 py-3 text-left text-sm",
              stationId ? "text-slate-700" : "bg-slate-200 font-semibold",
            ].join(" ")}
          >
            {t("counterOrders.allStations")}
          </button>
          {stations.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setStationId(id);
                setPage(1);
              }}
              className={[
                "flex w-full items-center px-4 py-3 text-left text-sm",
                stationId === id ? "bg-white font-semibold" : "text-slate-700",
              ].join(" ")}
            >
              <span className="truncate">
                {t("counterOrders.station")} {shortStation(id)}
              </span>
            </button>
          ))}
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tickets.length ? (
              tickets.map((ticket) => (
                <article
                  key={ticket.id || ticket.ticketNumber}
                  className="grid grid-cols-[auto_4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3"
                >
                  <span
                    className={[
                      "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                      statusTone[ticket.status] || "bg-slate-200 text-slate-800",
                    ].join(" ")}
                  >
                    {t(`counterOrders.statuses.${ticket.status.toLowerCase()}`)}
                  </span>
                  <time className="text-sm text-slate-500">
                    {clockTime(ticket.firedAt || ticket.createdAt)}
                  </time>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {ticket.ticketNumber || ticket.id}
                      {ticket.courseType ? ` | ${ticket.courseType}` : ""}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {ticket.stationId
                        ? `${t("counterOrders.station")} ${shortStation(ticket.stationId)}`
                        : t("counterOrders.noStation")}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={t("counterOrders.printTicket", {
                      ticket: ticket.ticketNumber || ticket.id,
                    })}
                    onClick={() => void printTicket(ticket)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white"
                  >
                    ⎙
                  </button>
                </article>
              ))
            ) : (
              <p className="p-6 text-sm text-slate-500">{t("counterOrders.noTickets")}</p>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-sm">
            <span className={unlinkedCount ? "text-red-600" : "text-slate-400"}>
              {t("counterOrders.unlinked", { count: unlinkedCount })}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("counterOrders.previous")}
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="px-2 disabled:opacity-30"
              >
                ‹
              </button>
              <span>
                {t("counterOrders.pageLabel", { page, pages: totalPages })}
              </span>
              <button
                type="button"
                aria-label={t("counterOrders.next")}
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="px-2 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </footer>
        </div>
      </div>

      {selectedTicket ? (
        <article className="kds-print-sheet p-4 text-sm">
          <p className="text-center text-xs uppercase tracking-wide">
            {t("counterOrders.print.kitchenTitle")}
          </p>
          <h2 className="mt-2 text-center text-xl font-bold">
            {selectedTicket.ticketNumber || selectedTicket.id}
          </h2>
          <p className="mt-1 text-center font-semibold">{selectedTicket.status}</p>
          <dl className="mt-4 space-y-1">
            <div className="flex justify-between gap-3">
              <dt>{t("counterOrders.print.course")}</dt>
              <dd>{selectedTicket.courseType || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t("counterOrders.print.firedAt")}</dt>
              <dd>{clockTime(selectedTicket.firedAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t("counterOrders.station")}</dt>
              <dd className="truncate">{selectedTicket.stationId || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t("counterOrders.print.orderRef")}</dt>
              <dd className="truncate">{selectedTicket.salesOrderId || "—"}</dd>
            </div>
          </dl>
        </article>
      ) : null}
    </section>
  );
}
