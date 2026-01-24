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
}: TableProps<T>) {
  if (loading) {
    return <div className="text-sm text-slate-600">Loading…</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return <div className="text-sm text-slate-600">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm text-slate-700">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
          {rows.map((row) => {
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
          })}
        </tbody>
      </table>
    </div>
  );
}
