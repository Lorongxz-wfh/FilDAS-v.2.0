import React from "react";
import InlineSpinner from "./loader/InlineSpinner";
import TableSkeleton from "./loader/TableSkeleton";

type Align = "left" | "center" | "right";

export type TableColumn<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: Align;
};

export type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  loading?: boolean;
  loadingStyle?: "spinner" | "skeleton";
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
  className?: string; // allow parent to control height (e.g. h-full)
};

const alignClass = (align: Align | undefined) => {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
};

export default function Table<T>({
  columns,
  rows,
  loading = false,
  loadingStyle = "spinner",
  error = null,
  emptyMessage = "No data.",
  onRowClick,
  rowKey,
  className,
}: TableProps<T>) {
  return (
    <div
      className={`relative min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white ${
        loading && loadingStyle === "skeleton" ? "min-h-130" : ""
      } ${className ?? ""}`}
    >
      <div className="h-full min-h-0 overflow-y-auto overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-backdrop-filter:bg-slate-50/80">
            <tr className="border-b border-slate-200">
              {columns.map((c, idx) => (
                <th
                  key={c.key}
                  className={[
                    "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600",
                    "shadow-[inset_0_-1px_0_0_rgb(226,232,240)]",
                    alignClass(c.align),
                    idx === 0 ? "pl-5" : "",
                    c.headerClassName ?? "",
                  ].join(" ")}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && loadingStyle === "skeleton" ? (
              Array.from({ length: 8 }).map((_, r) => (
                <tr key={`sk-${r}`} className="border-t border-slate-100">
                  {columns.map((c, idx) => (
                    <td
                      key={`sk-${r}-${c.key}`}
                      className={`px-4 py-3 ${alignClass(c.align)} ${idx === 0 ? "pl-5" : ""}`}
                    >
                      <div className="h-3 w-full rounded bg-slate-100 border border-slate-200/70 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4">
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                </td>
              </tr>
            ) : !loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-4 text-sm text-slate-600"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const clickable = !!onRowClick;
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={clickable ? () => onRowClick?.(row) : undefined}
                    className={
                      clickable
                        ? "cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                        : "border-t border-slate-100"
                    }
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-3 ${alignClass(c.align)} ${c.className ?? ""}`}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {loading && loadingStyle === "spinner" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <InlineSpinner />
              Loading...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
