import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import { Card, CardBody } from "../components/ui/Card";
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
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
};

const MyActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const openByVersionId = async (versionId: number) => {
    const { document } = await getDocumentVersion(versionId);
    navigate(`/documents/${document.id}`);
  };

  const [page, setPage] = useState(1);
  const perPage = 25;

  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const canPrev = currentPage > 1;
  const canNext = currentPage < lastPage;

  const titleRight = useMemo(() => {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/work-queue")}
        >
          ← Work queue
        </Button>
      </div>
    );
  }, [navigate]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
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
        if (!alive) return;
        setError(e?.message ?? "Failed to load activity logs");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [page]);

  return (
    <PageFrame
      title="My Activity"
      right={titleRight}
      contentClassName="space-y-6"
    >
      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <CardBody className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Proof log
            </div>
            <div className="text-xs text-slate-600">
              Shows actions you performed (scope: mine).
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <div className="text-xs text-slate-600 tabular-nums">
              Page {currentPage} / {lastPage}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {loading ? (
            <div className="space-y-2">
              <SkeletonList rows={8} rowClassName="h-10" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-600">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {l.label || l.event}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {l.event}
                        {l.document_id ? ` • Doc#${l.document_id}` : ""}
                        {l.document_version_id
                          ? ` • Ver#${l.document_version_id}`
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-[11px] text-slate-500">
                      {formatWhen(l.created_at)}
                    </div>
                  </div>

                  {(l.document_id || l.document_version_id) && (
                    <div className="mt-2 flex gap-2">
                      {l.document_version_id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openByVersionId(Number(l.document_version_id))
                          }
                        >
                          Open version
                        </Button>
                      ) : l.document_id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/documents/${l.document_id}`)
                          }
                        >
                          Open document
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </PageFrame>
  );
};

export default MyActivityPage;
