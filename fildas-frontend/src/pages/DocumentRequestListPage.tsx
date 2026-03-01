import React from "react";
import { Link } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame.tsx";
import Button from "../components/ui/Button.tsx";
import {
  listDocumentRequestInbox,
  listDocumentRequests,
} from "../services/documentRequests";
import { getAuthUser } from "../lib/auth.ts";

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

type Paginator<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  from?: number | null;
  to?: number | null;
};

export default function DocumentRequestListPage() {
  const me = getAuthUser();
  const role = roleLower(me);

  const isQaAdmin = ["qa", "sysadmin", "admin"].includes(role);

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<
    "" | "open" | "closed" | "cancelled"
  >("");

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);

  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Paginator<any> | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const qDebounced = useDebouncedValue(q, 400);

  const load = React.useCallback(
    async (opts?: { page?: number }) => {
      const targetPage = opts?.page ?? page;

      setLoading(true);
      setError(null);

      try {
        if (isQaAdmin) {
          const data = await listDocumentRequests({
            q: qDebounced.trim() || undefined,
            status: status || undefined,
            per_page: perPage,
            page: targetPage,
          } as any);
          setResult(data ?? null);
          setRows(Array.isArray(data?.data) ? data.data : []);
        } else {
          const data = await listDocumentRequestInbox({
            q: qDebounced.trim() || undefined,
            per_page: perPage,
            page: targetPage,
          } as any);
          setResult(data ?? null);
          setRows(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message ?? e?.message ?? "Failed to load.");
        setResult(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, qDebounced, status, isQaAdmin],
  );

  React.useEffect(() => {
    // reset to page 1 when filters change
    setPage(1);
  }, [qDebounced, status, perPage]);

  React.useEffect(() => {
    load({ page }).catch(() => {});
  }, [load, page]);

  return (
    <PageFrame
      title="Document requests"
      right={
        isQaAdmin ? (
          <Link
            to="/document-requests/create"
            className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            Create request
          </Link>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title/description…"
            className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          {isQaAdmin ? (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          ) : null}

          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => load({ page })}
            disabled={loading}
          >
            Refresh
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {typeof result?.from !== "undefined" ? (
              <span className="text-xs text-slate-500">
                Showing {result?.from ?? 0}–{result?.to ?? 0} of{" "}
                {result?.total ?? 0}
              </span>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || (result?.current_page ?? page) <= 1}
            >
              Prev
            </Button>

            <span className="text-xs text-slate-600">
              Page {result?.current_page ?? page} / {result?.last_page ?? "?"}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((p) => Math.min(result?.last_page ?? p + 1, p + 1))
              }
              disabled={
                loading ||
                (result?.last_page != null &&
                  (result?.current_page ?? page) >= result.last_page)
              }
            >
              Next
            </Button>
          </div>

          {loading ? (
            <span className="text-xs text-slate-500">Loading…</span>
          ) : null}
          {error ? (
            <span className="text-xs text-rose-600">{error}</span>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500">
            <div className="col-span-1">ID</div>
            <div className="col-span-6">Title</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Due</div>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-600">
              No requests found.
            </div>
          ) : (
            rows.map((r) => (
              <Link
                key={r.id}
                to={`/document-requests/${r.id}`}
                className="grid grid-cols-12 gap-2 px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="col-span-1 text-slate-700">{r.id}</div>
                <div className="col-span-6 font-medium text-slate-900">
                  {r.title}
                </div>
                <div className="col-span-2 text-slate-700">{r.status}</div>
                <div className="col-span-3 text-slate-600">
                  {r.due_at ? new Date(r.due_at).toLocaleString() : "-"}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </PageFrame>
  );
}
