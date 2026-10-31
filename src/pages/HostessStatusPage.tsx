import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHostessBoard } from "@/core/presentation/hooks/useHostessBoard";
import { useRoomText } from "@/core/presentation/hooks/useRoomText";
import { hostessStatusRows } from "@/lib/ktv/hostessStatus";
import { HostessTime } from "./ktv/HostessStrip";

const TICK_MS = 15_000;

const clock = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

/** Every hostess working now: free or in a room, since when and how long she has left. */
export function HostessStatusPage() {
  const tr = useRoomText("ktv");
  const navigate = useNavigate();
  const { hostesses, error, loaded } = useHostessBoard();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  const rows = hostessStatusRows(hostesses, nowMs);
  const inRooms = rows.filter((row) => row.inRoom).length;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#080808] p-4 text-white">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
        <h1 className="text-xl font-bold">{tr("hostessStatusTitle")}</h1>
        <p className="text-sm text-slate-400">
          {tr("hostessesSummary", { working: rows.length, inRooms, free: rows.length - inRooms })}
        </p>
      </header>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {loaded && !rows.length && !error ? (
        <p className="mt-10 text-center text-slate-400">{tr("noHostesses")}</p>
      ) : null}
      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">{tr("hostessColumn")}</th>
                <th className="px-3 py-2">{tr("statusColumn")}</th>
                <th className="px-3 py-2">{tr("roomColumn")}</th>
                <th className="px-3 py-2">{tr("sinceColumn")}</th>
                <th className="px-3 py-2">{tr("timeLeftColumn")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className={row.tone === "over" ? "bg-red-950/30" : row.tone === "soon" ? "bg-amber-950/20" : ""}>
                  <td className="px-3 py-3">
                    <span className="block font-semibold">{row.name}</span>
                    {row.fullName !== row.name ? (
                      <span className="block text-xs text-slate-400">{row.fullName}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">{row.inRoom ? tr("hostessInRoomStatus") : tr("hostessFree")}</td>
                  <td className="px-3 py-3">
                    {row.inRoom && row.roomId ? (
                      <button
                        type="button"
                        className="min-h-9 rounded border border-slate-600 px-2 font-semibold hover:bg-white/5"
                        onClick={() => navigate(`/ktv/room/${row.roomId}`)}
                      >
                        {row.roomNumber}
                      </button>
                    ) : (
                      row.roomNumber ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{clock(row.since)}</td>
                  <td className="px-3 py-3">{row.inRoom ? <HostessTime row={row} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
