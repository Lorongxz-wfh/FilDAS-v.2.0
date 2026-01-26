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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {showHeader && (
        <div
          className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-slate-200/80 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* rows */}
      <div className="divide-y divide-slate-100">
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
                  "h-3 rounded bg-slate-100 border border-slate-200/70 animate-pulse",
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
