import React from "react";
import { Building2 } from "lucide-react";
import Skeleton from "../ui/loader/Skeleton";

export type OfficeCreationDatum = {
  office_code: string;
  office_name: string;
  internal: number;
  external: number;
  forms: number;
  total: number;
};

const BAR_COLOR = "#38bdf8";

// ── Skeleton ──────────────────────────────────────────────────────────────────

const ChartSkeleton = () => (
  <div className="flex flex-col divide-y divide-slate-100 dark:divide-surface-400">
    {[80, 60, 90, 45, 70, 55].map((w, i) => (
      <div key={i} className="flex items-center gap-3 py-2.5 px-3">
        <Skeleton className="h-2.5 w-4 shrink-0" />
        <Skeleton className="h-2.5 w-8 shrink-0" />
        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-surface-400 overflow-hidden">
          <div className="animate-pulse h-full rounded-full bg-slate-200 dark:bg-surface-300" style={{ width: `${w}%` }} />
        </div>
        <Skeleton className="h-2.5 w-5 shrink-0" />
      </div>
    ))}
  </div>
);

// ── Empty ─────────────────────────────────────────────────────────────────────

const EmptyChart = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-lg border border-dashed border-slate-200 dark:border-surface-300 bg-slate-50/50 dark:bg-surface-600/30 text-slate-400 dark:text-slate-500">
    <Building2 className="h-5 w-5 opacity-40" />
    <span className="text-xs font-medium">No data available</span>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

const OfficeCreationChart: React.FC<{
  data: OfficeCreationDatum[];
  loading?: boolean;
  maxRows?: number;
}> = ({ data, loading = false, maxRows = 10 }) => {
  if (loading) return <ChartSkeleton />;
  if (!data?.length) return <EmptyChart />;

  const sorted = [...data].sort((a, b) => b.total - a.total).slice(0, maxRows);
  const maxVal = sorted[0]?.total || 1;

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 pb-1.5 border-b border-slate-100 dark:border-surface-400">
        <span className="w-4 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">#</span>
        <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Office</span>
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Volume</span>
        <span className="w-8 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Docs</span>
      </div>

      {/* Scrollable rows — shows ~6 rows, rest scrollable */}
      <div className="overflow-y-auto divide-y divide-slate-50 dark:divide-surface-500" style={{ maxHeight: "13.5rem" }}>
        {sorted.map((d, i) => {
          const pct = (d.total / maxVal) * 100;
          return (
            <div
              key={d.office_code}
              className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-surface-600/50 transition-colors"
            >
              {/* Rank */}
              <span className="w-4 shrink-0 text-[11px] tabular-nums text-slate-400 dark:text-slate-500 text-right">
                {i + 1}
              </span>

              {/* Office code */}
              <span className="w-10 shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate" title={d.office_name}>
                {d.office_code}
              </span>

              {/* Bar */}
              <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-surface-400 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: BAR_COLOR }}
                />
              </div>

              {/* Count */}
              <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {d.total}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 px-3">
        Showing {sorted.length} office{sorted.length !== 1 ? "s" : ""} · creation date range applied
      </p>
    </div>
  );
};

export default OfficeCreationChart;
