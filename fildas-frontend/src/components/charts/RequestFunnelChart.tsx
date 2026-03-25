import React from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type FunnelStep = {
  stage: string;
  count: number;
  color: string;
};

// ── Component ──────────────────────────────────────────────────────────────────

const RequestFunnelChart: React.FC<{ data: FunnelStep[] }> = ({ data }) => {
  const max = data[0]?.count ?? 1;

  return (
    <div className="space-y-1 py-1">
      {data.map((step, i) => {
        const pct = Math.round((step.count / max) * 100);
        const prev = data[i - 1];
        const dropoff = prev ? prev.count - step.count : 0;
        const dropPct = prev ? Math.round((dropoff / prev.count) * 100) : 0;

        return (
          <React.Fragment key={step.stage}>
            {/* Drop-off connector */}
            {i > 0 && (
              <div
                className="flex items-center gap-2 py-0.5"
                style={{ paddingLeft: 148 }}
              >
                <div className="w-px h-3 bg-slate-200 dark:bg-surface-400" />
                {dropoff > 0 && (
                  <span className="text-xs text-rose-400 dark:text-rose-500">
                    −{dropoff} dropped ({dropPct}%)
                  </span>
                )}
              </div>
            )}

            {/* Stage row */}
            <div className="flex items-center gap-3">
              {/* Label */}
              <span className="w-36 shrink-0 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                {step.stage}
              </span>

              {/* Bar */}
              <div className="relative flex-1 h-8 rounded-md bg-slate-100 dark:bg-surface-400 overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: step.color }}
                />
                {pct >= 15 && (
                  <span className="absolute inset-0 flex items-center pl-3 text-xs font-semibold text-white pointer-events-none">
                    {pct}%
                  </span>
                )}
              </div>

              {/* Count */}
              <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {step.count}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default RequestFunnelChart;
