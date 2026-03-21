import React from "react";

export const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-2 rounded-md bg-slate-50 dark:bg-surface-600/50 border border-slate-100 dark:border-surface-400 px-3 py-2">
    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 pt-px">
      {label}
    </span>
    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-right wrap-break-word max-w-[60%]">
      {value ?? (
        <span className="text-slate-400 dark:text-slate-500 font-normal">
          —
        </span>
      )}
    </span>
  </div>
);

export function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
