import React from "react";
import { Navigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import Table, { type TableColumn } from "../components/ui/Table";
import { listActivityLogs } from "../services/documents";
import Modal from "../components/ui/Modal";

type Scope = "all" | "office" | "mine";

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (!value || value === "—") return null;
  return (
    <div className="flex gap-3 py-2 border-b border-slate-100 dark:border-surface-400 last:border-0">
      <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-slate-800 dark:text-slate-200 break-all">
        {value}
      </span>
    </div>
  );
}

function ActivityModal({ row, onClose }: { row: any; onClose: () => void }) {
  return (
    <Modal open={true} title={row.event} onClose={onClose}>
      <div className="space-y-0">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          {formatWhen(row.created_at)}
        </p>
        <DetailRow label="Label" value={row.label ?? "—"} />
        <DetailRow
          label="Document"
          value={
            row.document?.title ??
            (row.document_id ? `#${row.document_id}` : "—")
          }
        />
        <DetailRow
          label="Version"
          value={row.document_version_id ? `v${row.document_version_id}` : "—"}
        />
        <DetailRow
          label="Actor"
          value={
            row.actor_user?.name ??
            (row.actor_user_id ? `User #${row.actor_user_id}` : "—")
          }
        />
        <DetailRow
          label="Actor office"
          value={
            row.actor_office
              ? `${row.actor_office.name} (${row.actor_office.code})`
              : row.actor_office_id
                ? `Office #${row.actor_office_id}`
                : "—"
          }
        />
        <DetailRow
          label="Target office"
          value={
            row.target_office
              ? `${row.target_office.name} (${row.target_office.code})`
              : row.target_office_id
                ? `Office #${row.target_office_id}`
                : "—"
          }
        />
        {row.meta && (
          <DetailRow
            label="Meta"
            value={
              <pre className="text-xs bg-slate-50 dark:bg-surface-600 rounded-lg p-3 overflow-x-auto">
                {typeof row.meta === "string"
                  ? row.meta
                  : JSON.stringify(row.meta, null, 2)}
              </pre>
            }
          />
        )}
      </div>
    </Modal>
  );
}

const ActivityLogsPage: React.FC = () => {
  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  const [scope, setScope] = React.useState<Scope>("all");
  const [q, setQ] = React.useState("");
  const [qDebounced, setQDebounced] = React.useState("");
  const [selectedRow, setSelectedRow] = React.useState<any | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const [rows, setRows] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRows([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
  }, [scope, qDebounced]);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!hasMore && page > 1) return;
      setLoading(true);
      setError(null);
      try {
        const res = await listActivityLogs({
          scope,
          q: qDebounced.trim() || undefined,
          page,
          per_page: 25,
        });
        if (!alive) return;
        const incoming = res.data ?? [];
        setRows((prev) => (page === 1 ? incoming : [...prev, ...incoming]));
        const meta = res.meta ?? null;
        setHasMore(
          meta?.current_page != null &&
            meta?.last_page != null &&
            meta.current_page < meta.last_page,
        );
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load activity logs.");
      } finally {
        if (!alive) return;
        setLoading(false);
        setInitialLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [page, scope, qDebounced, hasMore]);

  const columns: TableColumn<any>[] = [
    {
      key: "when",
      header: "When",
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
          {formatWhen(r.created_at)}
        </span>
      ),
    },
    {
      key: "event",
      header: "Event",
      render: (r) => (
        <span className="font-medium text-slate-800 dark:text-slate-200 truncate block group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
          {r.event}
        </span>
      ),
    },
    {
      key: "label",
      header: "Label",
      render: (r) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
          {r.label ?? "—"}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (r) => (
        <div className="min-w-0">
          <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
            {r.actor_user?.name ?? "—"}
          </div>
          {r.actor_office && (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              {r.actor_office.name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "doc",
      header: "Doc",
      render: (r) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
          {r.document?.title ?? (r.document_id ? `#${r.document_id}` : "—")}
        </span>
      ),
    },
  ];

  return (
    <PageFrame
      title="Audit Logs"
      contentClassName="flex flex-col min-h-0 gap-4"
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-200"
        >
          <option value="all">All</option>
          <option value="office">My office</option>
          <option value="mine">Mine</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search event/label…"
          className="w-72 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-200 dark:placeholder-slate-500"
        />
        <button
          type="button"
          onClick={() => {
            setQ("");
            setScope("all");
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-300 dark:hover:bg-surface-400 transition-colors"
        >
          Clear
        </button>
        {error && <span className="text-xs text-rose-500">{error}</span>}
      </div>

      {/* Table */}
      <div
        className="rounded-xl border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500 overflow-hidden"
        style={{ height: "calc(100vh - 190px)" }}
      >
        <Table
          bare
          className="h-full"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setSelectedRow(r)}
          loading={loading}
          initialLoading={initialLoading}
          error={error}
          emptyMessage="No logs found."
          hasMore={hasMore}
          onLoadMore={() => setPage((p) => p + 1)}
          gridTemplateColumns="13rem 1fr 1fr 5rem 5rem"
        />
      </div>

      {selectedRow && (
        <ActivityModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </PageFrame>
  );
};

export default ActivityLogsPage;
