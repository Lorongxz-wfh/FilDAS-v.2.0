import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDocuments, getCurrentUserOfficeId } from "../services/documents";
import type { Document } from "../services/documents";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import InlineSpinner from "../components/ui/loader/InlineSpinner";
import SkeletonList from "../components/ui/loader/SkeletonList";

import {
  getUserRole,
  isPendingForRole,
  isQA,
  isDepartment,
} from "../lib/roleFilters";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const role = getUserRole();
  const myOfficeId = getCurrentUserOfficeId();

  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listDocuments();
        setDocs(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pending = useMemo(
    () => docs.filter((d) => isPendingForRole(d.status, role)),
    [docs, role],
  );

  const officialCount = useMemo(
    () => docs.filter((d) => d.status === "Distributed").length,
    [docs],
  );

  const myOfficeDocsCount = useMemo(() => {
    if (!isDepartment(role)) return null;
    return docs.filter((d) => Number(d.office_id) === Number(myOfficeId))
      .length;
  }, [docs, role, myOfficeId]);

  const recentOfficial = useMemo(() => {
    return docs
      .filter((d) => d.status === "Distributed")
      .slice()
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 5);
  }, [docs]);

  const recentActive = useMemo(() => {
    return docs
      .slice()
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 5);
  }, [docs]);

  return (
    <div className="min-h-0 flex flex-col overflow-hidden h-[calc(100vh-64px)]">
      {/* Header + actions (fixed, non-scrolling) */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 backdrop-blur pl-2 pr-6 pt-0 pb-3 lg:pl-4 lg:pr-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/work-queue")}
            >
              Go to work queue
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/documents")}
            >
              Open document library
            </Button>

            {isQA(role) ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => navigate("/documents/create")}
              >
                Create document
              </Button>
            ) : isDepartment(role) ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate("/documents/request")}
              >
                Request document
              </Button>
            ) : null}
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
      </div>

      {/* Scrollable body (below header) */}
      <section className="min-h-0 flex-1 overflow-y-auto space-y-6 pl-2 pr-6 pt-4 pb-0 lg:pl-4 lg:pr-8">
        {/* Stats */}
        <Card className="overflow-hidden">
          <CardBody className="bg-white p-0">
            <div
              className={`grid grid-cols-1 divide-y divide-slate-100 md:divide-y-0 md:divide-x md:grid-cols-${
                isDepartment(role) ? "4" : "3"
              }`}
            >
              <div className="text-center py-3">
                <div className="text-3xl font-semibold text-sky-700 tabular-nums">
                  {loading ? (
                    <InlineSpinner className="h-5 w-5 border-2" />
                  ) : (
                    pending.length
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Pending
                </div>
              </div>

              <div className="text-center py-3">
                <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                  {loading ? (
                    <InlineSpinner className="h-5 w-5 border-2" />
                  ) : (
                    docs.length
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Total documents
                </div>
              </div>

              {isDepartment(role) && (
                <button
                  type="button"
                  onClick={() => navigate("/documents")}
                  className="text-center rounded-lg p-2 transition hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  title="Open your office documents"
                >
                  <div className="text-2xl font-bold text-indigo-600 tabular-nums">
                    {loading ? (
                      <InlineSpinner className="h-5 w-5 border-2" />
                    ) : (
                      (myOfficeDocsCount ?? 0)
                    )}
                  </div>
                  <div className="text-xs text-slate-600 uppercase tracking-wider">
                    My office documents
                  </div>
                </button>
              )}

              <div className="text-center py-3">
                <div className="text-2xl font-semibold text-emerald-700 tabular-nums">
                  {loading ? (
                    <InlineSpinner className="h-5 w-5 border-2" />
                  ) : (
                    officialCount
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Official
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Pending actions */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Pending actions
                </div>
                <div className="text-xs text-slate-600">
                  Top items requiring your action.
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/work-queue")}
              >
                View all
              </Button>
            </div>

            <div className="mt-3 space-y-2 relative min-h-24">
              {loading ? (
                <SkeletonList rows={5} rowClassName="h-10" />
              ) : (
                <>
                  {pending.slice(0, 5).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => navigate(`/documents/${d.id}`)}
                      className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                    >
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-slate-500">{d.status}</div>
                    </button>
                  ))}

                  {pending.length === 0 && (
                    <div className="text-sm text-slate-600">
                      No pending actions right now.
                    </div>
                  )}
                </>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Recent cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Recent official versions */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Recent official versions
                  </div>
                  <div className="text-xs text-slate-600">
                    Recently distributed documents.
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/documents")}
                >
                  Open library
                </Button>
              </div>

              <div className="mt-3 space-y-2 relative min-h-24">
                {loading ? (
                  <SkeletonList rows={4} rowClassName="h-10" />
                ) : (
                  <>
                    {recentOfficial.length === 0 && (
                      <div className="text-sm text-slate-600">
                        No official versions yet.
                      </div>
                    )}

                    {recentOfficial.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => navigate(`/documents/${d.id}`)}
                        className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                      >
                        <div className="font-medium">{d.title}</div>
                        <div className="text-xs text-slate-500">
                          {d.code ?? "—"}
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Recent activity
                  </div>
                  <div className="text-xs text-slate-600">
                    Latest updated documents (for quick access).
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2 relative min-h-24">
                {loading ? (
                  <SkeletonList rows={4} rowClassName="h-10" />
                ) : (
                  <>
                    {recentActive.length === 0 && (
                      <div className="text-sm text-slate-600">
                        No documents yet.
                      </div>
                    )}

                    {recentActive.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => navigate(`/documents/${d.id}`)}
                        className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                      >
                        <div className="font-medium">{d.title}</div>
                        <div className="text-xs text-slate-500">{d.status}</div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Recent comments (husk only) */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Recent comments
                  </div>
                  <div className="text-xs text-slate-600">
                    Latest notes across documents (coming soon).
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title="Coming soon"
                >
                  View all
                </Button>
              </div>

              <div className="mt-3 relative min-h-24">
                {loading ? (
                  <SkeletonList rows={3} rowClassName="h-10" />
                ) : (
                  <div className="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-600">
                    No comments to show yet.
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
