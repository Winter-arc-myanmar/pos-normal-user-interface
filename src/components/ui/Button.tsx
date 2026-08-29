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
  primary:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-500 hover:border-blue-600 shadow-sm",
  secondary:
    "bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white border-slate-600 shadow-sm",
  outline:
    "bg-transparent hover:bg-white/10 active:bg-white/15 text-slate-200 border-slate-600 hover:border-slate-500",
  destructive:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-500 shadow-sm",
  ghost:
    "bg-transparent hover:bg-white/10 active:bg-white/15 text-slate-300 border-transparent hover:border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[32px]",
  md: "px-4 py-2 text-sm gap-2 min-h-[40px]",
  lg: "px-5 py-2.5 text-sm gap-2 min-h-[44px]",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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
          "inline-flex items-center justify-center rounded-sm border font-semibold",
          "transition-all duration-150 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 focus:ring-offset-black",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none",
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
