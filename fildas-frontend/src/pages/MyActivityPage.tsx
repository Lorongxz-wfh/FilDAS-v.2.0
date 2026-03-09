import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import SkeletonList from "../components/ui/loader/SkeletonList";
import { getDocumentVersion, listActivityLogs } from "../services/documents";

type ActivityLogRow = {
  id: number;
  event: string;
  label?: string | null;
  document_id?: number | null;
  document_version_id?: number | null;
  created_at?: string | null;
};

const formatWhen = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const MyActivityPage: React.FC = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const perPage = 25;
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const openByVersionId = async (versionId: number) => {
    const { document } = await getDocumentVersion(versionId);
    navigate(`/documents/${document.id}`);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res: any = await listActivityLogs({
          scope: "mine",
          per_page: perPage,
          page,
        });
        if (!alive) return;
        setRows((res?.data ?? []) as ActivityLogRow[]);
        setCurrentPage(Number(res?.current_page ?? page));
        setLastPage(Number(res?.last_page ?? 1));
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load activity");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page]);

  const canPrev = currentPage > 1;
  const canNext = currentPage < lastPage;

  return (
    <PageFrame
      title="My Activity"
      contentClassName="flex flex-col gap-4 h-full"
      onBack={() => navigate("/work-queue")}
    >
      {/* Error */}
      {error && (
        <div className="shrink-0 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="flex flex-col rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 overflow-hidden flex-1 min-h-0">
        {/* Card header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-surface-400 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Proof log
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actions you performed
            </p>
          </div>
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-400 disabled:opacity-40 transition"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {currentPage} / {lastPage}
            </span>
            <button
              type="button"
              disabled={!canNext || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-400 disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <SkeletonList rows={8} rowClassName="h-12 rounded-xl" />
          ) : rows.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No activity yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {l.label || l.event}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {l.event}
                      {l.document_id ? ` · Doc #${l.document_id}` : ""}
                      {l.document_version_id
                        ? ` · Ver #${l.document_version_id}`
                        : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                    {formatWhen(l.created_at)}
                  </div>

                  {(l.document_version_id || l.document_id) && (
                    <button
                      type="button"
                      onClick={() =>
                        l.document_version_id
                          ? openByVersionId(Number(l.document_version_id))
                          : navigate(`/documents/${l.document_id}`)
                      }
                      className="shrink-0 rounded-lg border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-400 transition"
                    >
                      Open →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageFrame>
  );
};

export default MyActivityPage;
