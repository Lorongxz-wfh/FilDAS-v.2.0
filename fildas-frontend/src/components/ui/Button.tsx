import React from "react";
import Tooltip from "./Tooltip";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "xs" | "sm" | "md" | "lg";
type Side = "top" | "bottom" | "left" | "right";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  tooltip?: string;
  tooltipSide?: Side;
  /** If true, and the button has multiple words or is specifically marked, it hides the text on mobile */
  responsive?: boolean;
};

const base =
  "cursor-pointer inline-flex items-center justify-center font-semibold rounded-md transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500/50";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 border border-brand-700/20 dark:border-white/10 shadow-lg shadow-brand-600/10",
  secondary:
    "bg-neutral-800 text-white hover:bg-neutral-900 dark:bg-surface-400 dark:hover:bg-surface-300 shadow-sm",
  outline:
    "border-2 border-brand-600 bg-transparent text-brand-700 hover:bg-brand-50 hover:border-brand-700 dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-900/20 shadow-sm",
  ghost:
    "text-neutral-600 hover:bg-neutral-100/80 dark:text-neutral-400 dark:hover:bg-surface-400/50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 shadow-lg shadow-red-600/10 border border-red-700/20 dark:border-white/10",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-lg shadow-emerald-600/10 border border-emerald-700/20 dark:border-white/10",
};

const sizes: Record<Size, string> = {
  xs: "px-3 py-1 text-xs gap-1",
  sm: "px-5 py-2 text-xs gap-1.5",
  md: "px-8 py-2.5 text-sm gap-2",
  lg: "px-10 py-3 text-base gap-2",
};

export default function Button({
  variant = "outline",
  size = "sm",
  loading = false,
  tooltip,
  tooltipSide = "top",
  responsive = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const btn = (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        base,
        variants[variant],
        sizes[size],
        responsive ? "[&>span]:hidden [&>span]:sm:inline" : "",
        className,
      ].join(" ")}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {size !== "xs" && <span>Processing…</span>}
        </div>
      ) : (
        children
      )}
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip} side={tooltipSide}>{btn}</Tooltip>;
  }
  return btn;
}
