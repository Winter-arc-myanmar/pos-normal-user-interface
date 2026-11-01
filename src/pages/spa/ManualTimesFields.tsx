import type { ManualTimes } from "@/lib/spa/manualTimes";
import { manualTimesBackwards } from "@/lib/spa/manualTimes";

const field = "mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2";

/** The guest's In and Out, pre-filled and changed by the cashier before paying. */
export function ManualTimesFields({
  value,
  onChange,
  sessionTime,
  tr,
}: {
  value: ManualTimes;
  onChange: (times: ManualTimes) => void;
  /** The room's own clock, shown beside for reference. */
  sessionTime: string;
  tr: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <div className="space-y-2 rounded border border-slate-800 bg-slate-900/50 p-3">
      <p className="text-sm text-slate-400">{tr("sessionTime", { time: sessionTime })}</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          {tr("manualIn")}
          <input
            type="datetime-local"
            value={value.inAt}
            onChange={(event) => onChange({ ...value, inAt: event.target.value })}
            className={field}
          />
        </label>
        <label className="block text-sm">
          {tr("manualOut")}
          <input
            type="datetime-local"
            value={value.outAt}
            onChange={(event) => onChange({ ...value, outAt: event.target.value })}
            className={field}
          />
        </label>
      </div>
      {manualTimesBackwards(value) ? (
        <p className="text-sm text-red-400">{tr("errors.manualTimes")}</p>
      ) : null}
    </div>
  );
}
