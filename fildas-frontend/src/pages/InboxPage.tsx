import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../services/documents";

const InboxPage: React.FC = () => {
  const navigate = useNavigate();

  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  const PER_PAGE = 25;

  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    async function load() {
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        setError(null);
        const res = await listNotifications({ page, perPage: PER_PAGE });

        if (!alive) return;

        setItems((prev) => {
          const next = page === 1 ? res.data : [...prev, ...res.data];
          // de-dupe by id
          const byId = new Map<number, NotificationItem>();
          for (const n of next) byId.set(n.id, n);
          return Array.from(byId.values());
        });

        setHasMore(Boolean(res.links?.next));
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load notifications.");
      } finally {
        if (!alive) return;
        setLoading(false);
        setLoadingMore(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [page]);

  return (
    <PageFrame
      title="Inbox"
      right={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={markingAll || loading}
            onClick={async () => {
              try {
                setMarkingAll(true);
                await markAllNotificationsRead();
                // reload first page after marking all
                setPage(1);
              } finally {
                setMarkingAll(false);
              }
            }}
          >
            {markingAll ? "Marking…" : "Mark all as read"}
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
    >
      <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-5">
        {loading ? (
          <Alert variant="warning">Loading…</Alert>
        ) : error ? (
          <Alert variant="warning">{error}</Alert>
        ) : items.length === 0 ? (
          <Alert variant="warning">Inbox is empty.</Alert>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const isUnread = !n.read_at;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={[
                    "w-full rounded-xl border px-4 py-3 text-left transition",
                    isUnread
                      ? "border-sky-200 bg-sky-50 hover:bg-sky-100"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                  onClick={async () => {
                    try {
                      if (!n.read_at) await markNotificationRead(n.id);
                      if (n.document_id)
                        navigate(`/documents/${n.document_id}`);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {n.title}
                      </div>
                      {n.body ? (
                        <div className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">
                          {n.body}
                        </div>
                      ) : null}
                      <div className="mt-2 text-[11px] text-slate-500">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                    {isUnread ? (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                    ) : null}
                  </div>
                </button>
              );
            })}

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loadingMore || !hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                {loadingMore
                  ? "Loading…"
                  : hasMore
                    ? "Load more"
                    : "No more results"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageFrame>
  );
};

export default InboxPage;
