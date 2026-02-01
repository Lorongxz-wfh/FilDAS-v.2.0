import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import { listActivityLogs } from "../services/documents";

type Scope = "all" | "office" | "mine";

const ActivityLogsPage: React.FC = () => {
  const navigate = useNavigate();

  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  const [scope, setScope] = React.useState<Scope>("all");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const perPage = 25;

  const [rows, setRows] = React.useState<any[]>([]);
  const [meta, setMeta] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const formatWhen = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return String(iso);
    }
  };

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await listActivityLogs({
          scope,
          q: q.trim() || undefined,
          page,
          per_page: perPage,
        });

        if (!alive) return;
        setRows(res.data ?? []);
        setMeta(res.meta ?? null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load activity logs.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [scope, q, page]);

  const lastPage = Number(meta?.last_page ?? 0);

  return (
    <PageFrame
      title="Audit Logs"
      right={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/my-activity")}
          >
            My Activity
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            ← Back
          </Button>
        </div>
      }
      contentClassName="space-y-4"
    >
      <Alert variant="warning">
        System-wide audit logs. Use Scope + Search. Next: date/event/office
        filters + linking to documents.
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={scope}
          onChange={(e) => {
            setPage(1);
            setScope(e.target.value as Scope);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="office">My office</option>
          <option value="mine">Mine</option>
        </select>

        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search event/label..."
          className="w-full md:w-96 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setQ("");
            setPage(1);
          }}
        >
          Clear
        </Button>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Event</th>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-left">Doc</th>
                <th className="px-3 py-2 text-left">Version</th>
                <th className="px-3 py-2 text-left">Actor user</th>
                <th className="px-3 py-2 text-left">Actor office</th>
                <th className="px-3 py-2 text-left">Target office</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={8}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={8}>
                    No logs found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                      {formatWhen(r.created_at)}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {r.event}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.label ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.document_id ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.document_version_id ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.actor_user_id ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.actor_office_id ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.target_office_id ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Page {page}
            {lastPage ? ` / ${lastPage}` : ""}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || (lastPage ? page >= lastPage : false)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </PageFrame>
  );
};

export default ActivityLogsPage;
