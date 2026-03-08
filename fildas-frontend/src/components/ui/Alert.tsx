import React from "react";

type Variant = "info" | "success" | "warning" | "danger";

export type AlertProps = {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const styles: Record<Variant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400",
};

export default function Alert({
  variant = "info",
  title,
  children,
  className = "",
}: AlertProps) {
  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 text-sm",
        styles[variant],
        className,
      ].join(" ")}
    >
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div>{children}</div>
    </div>
  );
}
