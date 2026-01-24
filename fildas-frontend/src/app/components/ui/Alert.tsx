import React from "react";

type Variant = "info" | "success" | "warning" | "danger";

export type AlertProps = {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const styles: Record<Variant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function Alert({
  variant = "info",
  title,
  children,
  className = "",
}: AlertProps) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm ${styles[variant]} ${className}`}
    >
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div>{children}</div>
    </div>
  );
}
