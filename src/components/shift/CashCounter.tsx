import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NOTES, countTotal, type NoteCount } from "@/lib/pos/cashCount";
import { money } from "./shiftApi";

const field =
  "min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-amber-500";

/** The cash in a drawer: typed as one total, or counted note by note. */
export function CashCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (total: number | null) => void;
}) {
  const { t } = useTranslation();
  const [byNotes, setByNotes] = useState(false);
  const [notes, setNotes] = useState<NoteCount>({});

  const setNote = (note: (typeof NOTES)[number], raw: string) => {
    const next = { ...notes, [note]: raw === "" ? undefined : Number(raw) };
    setNotes(next);
    onChange(countTotal(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <button
          type="button"
          className="text-xs font-medium text-amber-400 hover:text-amber-300"
          onClick={() => setByNotes((on) => !on)}
        >
          {byNotes ? t("shift.typeTotal") : t("shift.countByNotes")}
        </button>
      </div>
      {byNotes ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NOTES.map((note) => (
              <label key={note} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-14 shrink-0 text-right tabular-nums">{money(note)} ×</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={`${money(note)}`}
                  className={field}
                  value={notes[note] ?? ""}
                  onChange={(event) => setNote(note, event.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="text-right text-lg font-semibold tabular-nums text-white">
            {money(value ?? 0)}
          </p>
        </div>
      ) : (
        <input
          type="number"
          inputMode="decimal"
          min={0}
          aria-label={label}
          className={`${field} text-lg tabular-nums`}
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value === "" ? null : Math.max(0, Number(event.target.value)))
          }
        />
      )}
    </div>
  );
}
