import React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger";
type ButtonSize = "xs" | "sm" | "md";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const base =
  "inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap";

const byVariant: Record<ButtonVariant, string> = {
  primary: "bg-sky-600 text-white hover:bg-sky-700",
  secondary: "bg-slate-700 text-white hover:bg-slate-800",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
};

const bySize: Record<ButtonSize, string> = {
  xs: "px-3 py-1.5 text-xs",
  sm: "px-4 py-2 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export default function Button({
  variant = "outline",
  size = "sm",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${byVariant[variant]} ${bySize[size]} ${className}`}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
