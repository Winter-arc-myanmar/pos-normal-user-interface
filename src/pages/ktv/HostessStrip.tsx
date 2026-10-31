import type { HostessStatusRow } from "@/lib/ktv/hostessStatus";
import { formatMinutesLeft } from "@/lib/ktv/hostessStatus";
import { useRoomText } from "@/core/presentation/hooks/useRoomText";

const toneClass = {
  ok: "text-slate-300",
  soon: "text-amber-300",
  over: "text-red-300",
} as const;

/** One line under a hostess's name: her room and the time she has left there. */
export function HostessTime({ row }: { row: HostessStatusRow }) {
  const tr = useRoomText("ktv");
  if (!row.inRoom) return <span className="text-emerald-300">{tr("hostessFree")}</span>;
  if (row.minutesLeft === undefined) {
    return <span className="text-slate-300">{tr("hostessUntilClose")}</span>;
  }
  return (
    <span className={`tabular-nums ${toneClass[row.tone]}`}>
      {row.tone === "over"
        ? tr("hostessTimeUp")
        : `${row.tone === "soon" ? "⚠ " : ""}${tr("hostessLeft", { time: formatMinutesLeft(row.minutesLeft) })}`}
    </span>
  );
}

/** The hostesses working now, across the top of the KTV board. A tap opens her room. */
export function HostessStrip({
  rows,
  onOpenRoom,
}: {
  rows: HostessStatusRow[];
  onOpenRoom: (row: HostessStatusRow) => void;
}) {
  const tr = useRoomText("ktv");
  if (!rows.length) return null;
  const inRooms = rows.filter((row) => row.inRoom).length;
  return (
    <section aria-label={tr("hostessesTitle")} className="mt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {tr("hostessesSummary", { working: rows.length, inRooms, free: rows.length - inRooms })}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            disabled={!row.inRoom}
            aria-label={row.inRoom ? tr("openHostessRoom", { name: row.name }) : row.name}
            onClick={() => onOpenRoom(row)}
            className={`min-h-16 w-36 shrink-0 rounded-lg border px-3 py-2 text-left text-xs ${
              row.tone === "over"
                ? "border-red-500/70 bg-red-950/30"
                : row.tone === "soon"
                  ? "border-amber-500/70 bg-amber-950/20"
                  : row.inRoom
                    ? "border-slate-600 bg-slate-900"
                    : "border-slate-800 bg-slate-900/50"
            }`}
          >
            <span className="block truncate text-sm font-semibold text-white">{row.name}</span>
            <span className="block text-slate-400">
              {row.inRoom ? `● ${row.roomNumber}` : "○"}
            </span>
            <span className="block">
              <HostessTime row={row} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
