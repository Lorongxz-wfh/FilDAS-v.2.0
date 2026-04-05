import React from "react";

type Variant = "info" | "success" | "warning" | "error" | "danger" | "primary";

const boxStyles: Record<Variant, string> = {
  info:    "border-slate-200 bg-slate-50 text-slate-800 dark:border-surface-300 dark:bg-surface-400 dark:text-neutral-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900 dark:text-emerald-50",
  warning: "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-600 dark:text-white",
  error:   "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900 dark:text-rose-50",
  danger:  "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900 dark:text-rose-50",
  primary: "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-50",
};

export type AlertProps = {
  variant?: Variant;
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export default function Alert({
  variant = "info",
  title,
  icon,
  action,
  className = "",
  children,
}: AlertProps) {
  return (
    <div className={["rounded-md border px-4 py-3 text-sm", boxStyles[variant], className].join(" ")}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex flex-1 items-start gap-3 min-w-0">
          {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
          <div className="flex-1 min-w-0">
            {title && <div className="mb-1 font-semibold">{title}</div>}
            {children && <div className="leading-relaxed">{children}</div>}
          </div>
        </div>
        {action && <div className="shrink-0 flex items-center gap-2 mt-2 sm:mt-0">{action}</div>}
      </div>
    </div>
  );
}
