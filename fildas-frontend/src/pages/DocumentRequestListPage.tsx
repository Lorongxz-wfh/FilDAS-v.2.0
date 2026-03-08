import React from "react";
import PageFrame from "../components/layout/PageFrame.tsx";
import Button from "../components/ui/Button.tsx";
import {
  listDocumentRequestInbox,
  listDocumentRequests,
} from "../services/documentRequests";
import { useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth.ts";
import CreateDocumentRequestModal from "../components/documentRequests/CreateDocumentRequestModal";
import Table, { type TableColumn } from "../components/ui/Table";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase();
  const map: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    closed:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-surface-400 dark:text-slate-400 dark:border-surface-300",
    cancelled:
      "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    pending:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  };
  const cls = map[s] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${cls}`}
    >
      {String(status).toUpperCase()}
    </span>
  );
}

function roleLower(me: any) {
  const raw =
    (typeof me?.role === "string" ? me?.role : me?.role?.name) ??
    me?.role_name ??
    "";
  return String(raw).trim().toLowerCase();
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function DocumentRequestListPage() {
  const me = getAuthUser();
  const role = roleLower(me);
  const isQaAdmin = ["qa", "sysadmin", "admin"].includes(role);

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<
    "" | "open" | "closed" | "cancelled"
  >("");
  const [createOpen, setCreateOpen] = React.useState(false);

  const [rows, setRows] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const qDebounced = useDebouncedValue(q, 400);
  // scroll/sentinel handled by Table component

  const navigate = useNavigate();

  // Reset when filters change
  React.useEffect(() => {
    setRows([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
  }, [qDebounced, status, isQaAdmin]);

  // Load data
  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!hasMore && page > 1) return;
      setLoading(true);
      setError(null);
      try {
        const params: any = {
          q: qDebounced.trim() || undefined,
          per_page: 25,
          page,
        };
        if (isQaAdmin) params.status = status || undefined;

        const data = isQaAdmin
          ? await listDocumentRequests(params)
          : await listDocumentRequestInbox(params);

        if (!alive) return;

        const incoming = Array.isArray(data?.data) ? data.data : [];
        setRows((prev) => (page === 1 ? incoming : [...prev, ...incoming]));
        setHasMore(
          data?.current_page != null &&
            data?.last_page != null &&
            data.current_page < data.last_page,
        );
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message ?? e?.message ?? "Failed to load.");
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
  }, [page, qDebounced, status, isQaAdmin, hasMore]);

  // infinite scroll handled by Table component via onLoadMore

  return (
    <PageFrame
      title="Document Requests"
      right={
        isQaAdmin ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            Create request
          </Button>
        ) : null
      }
      contentClassName="flex flex-col min-h-0 gap-4"
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title/description…"
          className="w-72 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-200 dark:placeholder-slate-500"
        />
        {isQaAdmin && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-200"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
        {error && <span className="text-xs text-rose-500">{error}</span>}
      </div>

      {/* Table */}
      {(() => {
        const columns: TableColumn<any>[] = [
          {
            key: "id",
            header: "#",
            render: (r) => (
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                #{r.id}
              </span>
            ),
          },
          {
            key: "title",
            header: "Title",
            render: (r) => (
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {r.title}
              </span>
            ),
          },
          ...(isQaAdmin
            ? [
                {
                  key: "office",
                  header: "Office",
                  render: (r: any) => (
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {r.office_name ?? "—"}
                      {r.office_code && (
                        <span className="ml-1 text-slate-400 dark:text-slate-500">
                          ({r.office_code})
                        </span>
                      )}
                    </span>
                  ),
                },
              ]
            : []),
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "due",
            header: "Due",
            render: (r) => (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(r.due_at)}
              </span>
            ),
          },
        ];

        return (
          <div
            className="rounded-xl border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500 overflow-hidden"
            style={{ height: "calc(100vh - 210px)" }}
          >
            <Table
              bare
              className="h-full"
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/document-requests/${r.id}`)}
              loading={loading}
              initialLoading={initialLoading}
              error={error}
              emptyMessage="No requests found."
              hasMore={hasMore}
              onLoadMore={() => setPage((p) => p + 1)}
            />
          </div>
        );
      })()}

      <CreateDocumentRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </PageFrame>
  );
}
