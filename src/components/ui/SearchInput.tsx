import {
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { useTranslation } from "react-i18next";

type SearchInputProps = {
  onClear?: () => void;
  containerClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function SearchInput({
  value: controlledValue,
  onChange,
  onClear,
  placeholder = "Search...",
  disabled,
  className = "",
  containerClassName = "",
  ...props
}: SearchInputProps) {
  const { t } = useTranslation();
  const [internalValue, setInternalValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = controlledValue !== undefined;
  const displayValue = isControlled ? String(controlledValue) : internalValue;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue("");
    }
    // Create a synthetic change event with empty value
    if (onChange) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeInputValueSetter && inputRef.current) {
        nativeInputValueSetter.call(inputRef.current, "");
        inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    onClear?.();
    inputRef.current?.focus();
  };

  const hasValue = displayValue.length > 0;

  return (
    <div
      className={[
        "relative flex items-center",
        "bg-white border border-slate-200 rounded-lg",
        "focus-within:border-blue-900 focus-within:ring-[3px] focus-within:ring-blue-900/10",
        "transition-all duration-150",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        containerClassName,
      ].join(" ")}
    >
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex-shrink-0">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          "w-full bg-transparent border-none outline-none",
          "text-sm text-slate-900 placeholder:text-slate-400",
          "pl-10 pr-9 py-2",
          "rounded-lg",
          "focus:outline-none focus:ring-0",
          disabled ? "cursor-not-allowed" : "",
          className,
        ].join(" ")}
        {...props}
      />
      {hasValue ? (
        <button
          type="button"
          onClick={handleClear}
          className={[
            "absolute right-2.5 top-1/2 -translate-y-1/2",
            "inline-flex items-center justify-center",
            "w-5 h-5 rounded-full",
            "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-blue-900/30",
          ].join(" ")}
          aria-label={t("common.clearSearch")}
          tabIndex={-1}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}
