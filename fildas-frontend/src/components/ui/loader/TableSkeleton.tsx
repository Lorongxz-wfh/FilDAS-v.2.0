import React from "react";

type Props = {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
};

const TableSkeleton: React.FC<Props> = ({
  rows = 8,
  cols = 6,
  showHeader = true,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500">
      {showHeader && (
        <div
          className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-surface-400 dark:bg-surface-600"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-slate-200/80 animate-pulse dark:bg-surface-400"
            />
          ))}
        </div>
      )}

      {/* rows */}
      <div className="divide-y divide-slate-100 dark:divide-surface-400">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-3 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={[
                  "h-3 rounded bg-slate-100 border border-slate-200/70 animate-pulse dark:bg-surface-400 dark:border-surface-300",
                  c === 0 ? "col-span-2" : "",
                ].join(" ")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;
