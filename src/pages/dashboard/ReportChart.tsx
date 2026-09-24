export interface ChartPoint {
  label: string;
  value: number;
  display: string;
}

const COLORS = ["#1e3a8a", "#2563eb", "#0f766e", "#b45309", "#be123c", "#6d28d9", "#0369a1", "#3f6212"];

function Empty({ empty }: { empty: string }) {
  return <p className="text-sm text-slate-500">{empty}</p>;
}

function Legend({ points }: { points: Array<ChartPoint & { color: string }> }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
      {points.map((point) => (
        <li key={point.label} className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: point.color }} />
          <span className="truncate text-slate-700">{point.label}</span>
          <span className="ml-auto shrink-0 text-slate-500">{point.display}</span>
        </li>
      ))}
    </ul>
  );
}

export function PieChart({ points, empty }: { points: ChartPoint[]; empty: string }) {
  const usable = points.filter((point) => point.value > 0);
  if (!usable.length) return <Empty empty={empty} />;
  const total = usable.reduce((sum, point) => sum + point.value, 0);
  let cursor = -Math.PI / 2;
  const slices = usable.map((point, index) => {
    const sweep = (point.value / total) * Math.PI * 2;
    const start = cursor;
    cursor += sweep;
    const color = COLORS[index % COLORS.length];
    if (usable.length === 1 || sweep >= Math.PI * 2 - 0.001) {
      return { ...point, color, circle: true, d: "" };
    }
    const x1 = 50 + 38 * Math.cos(start);
    const y1 = 50 + 38 * Math.sin(start);
    const x2 = 50 + 38 * Math.cos(start + sweep);
    const y2 = 50 + 38 * Math.sin(start + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    return {
      ...point,
      color,
      circle: false,
      d: `M 50 50 L ${x1} ${y1} A 38 38 0 ${large} 1 ${x2} ${y2} Z`,
    };
  });

  return (
    <div>
      <svg viewBox="0 0 100 100" className="mx-auto h-40 w-40 sm:h-48 sm:w-48" role="img">
        {slices.map((slice) =>
          slice.circle ? (
            <circle key={slice.label} cx="50" cy="50" r="38" fill={slice.color} />
          ) : (
            <path key={slice.label} d={slice.d} fill={slice.color} />
          )
        )}
      </svg>
      <Legend points={slices} />
    </div>
  );
}

export function ColumnChart({ points, empty }: { points: ChartPoint[]; empty: string }) {
  if (!points.length) return <Empty empty={empty} />;
  const peak = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className="overflow-x-auto">
      <div className="flex h-44 min-w-full items-end gap-2" style={{ minWidth: `${points.length * 3.25}rem` }}>
        {points.map((point, index) => (
          <div key={point.label} className="flex min-w-10 flex-1 flex-col items-center justify-end">
            <span className="mb-1 max-w-full truncate text-[10px] text-slate-500">{point.display}</span>
            <div
              className="w-full max-w-10 rounded-t"
              style={{
                height: `${Math.max(6, (point.value / peak) * 100)}%`,
                background: COLORS[index % COLORS.length],
              }}
            />
            <span className="mt-1 w-full truncate text-center text-[10px] text-slate-600">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RankChart({ points, empty }: { points: ChartPoint[]; empty: string }) {
  if (!points.length) return <Empty empty={empty} />;
  const peak = Math.max(...points.map((point) => point.value), 1);
  return (
    <ul className="space-y-3">
      {points.map((point, index) => (
        <li key={point.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-900">{point.label}</span>
            <span className="shrink-0 text-slate-600">{point.display}</span>
          </div>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(6, (point.value / peak) * 100)}%`,
                background: COLORS[index % COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
