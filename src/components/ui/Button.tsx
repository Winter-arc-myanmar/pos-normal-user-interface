import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "destructive" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const variantStyles: Record<ButtonVariant, string> = {
  /* Primary — Save, Submit, Create, Refresh */
  primary:
    "bg-slate-900 hover:bg-slate-950 active:bg-slate-900 text-white border-slate-900 hover:border-slate-950 shadow-sm",
  /* Secondary — Cancel, Back, Close */
  secondary:
    "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300 shadow-sm",
  /* Outline — tertiary actions */
  outline:
    "bg-transparent hover:bg-slate-50 active:bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300",
  /* Destructive — Delete, Logout, Remove */
  destructive:
    "bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border-red-200 hover:border-red-300 shadow-sm",
  /* Ghost — Icon buttons, Refresh icon, Settings */
  ghost:
    "bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-500 border-transparent hover:border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[32px]",
  md: "px-4 py-2 text-sm gap-2 min-h-[40px]",
  lg: "px-5 py-2.5 text-sm gap-2 min-h-[44px]",
};

function Spinner() {
  return (
    <svg
      className="animate-spin -ml-1 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={[
          "inline-flex items-center justify-center font-semibold rounded-lg border",
          "transition-all duration-150 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-slate-900/30 focus:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          className,
        ].join(" ")}
        {...props}
      >
        {isLoading ? <Spinner /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
