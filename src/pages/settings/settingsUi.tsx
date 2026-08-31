import type { ReactNode } from "react";

type SettingsToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function SettingsToggle({ checked, onChange, label }: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        "relative h-7 w-12 rounded-full transition-colors",
        checked ? "bg-blue-600" : "bg-slate-300",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

type SettingsRowProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SettingsToggleRow({
  title,
  description,
  checked,
  onChange,
}: SettingsRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <SettingsToggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

type QuickChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function QuickChip({ label, active, onClick }: QuickChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-10 rounded-full border px-4 text-sm font-medium transition",
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
};

const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500";

export function SettingsField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: FieldProps) {
  return (
    <label className="block text-sm text-slate-600">
      {label}
      <input
        type={type}
        className={fieldClass}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
