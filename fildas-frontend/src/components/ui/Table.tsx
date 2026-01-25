import React from "react";

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
  error = null,
  emptyMessage = "No data.",
  onRowClick,
  rowKey,
  className,
}: TableProps<T>) {
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <div
      className={`min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white ${className ?? ""}`}
    >
      <div className="h-full min-h-0 overflow-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2 ${alignClass(c.align)} ${c.headerClassName ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-4 text-sm text-slate-600"
                >
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4">
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
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
                        className={`px-4 py-2 ${alignClass(c.align)} ${c.className ?? ""}`}
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
      </div>
    </div>
  );
}
