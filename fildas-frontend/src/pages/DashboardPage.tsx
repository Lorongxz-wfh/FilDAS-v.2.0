import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listDocuments,
  getCurrentUserOfficeId,
  getWorkQueue,
  type WorkQueueItem,
} from "../services/documents";
import type { Document } from "../services/documents";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import InlineSpinner from "../components/ui/loader/InlineSpinner";
import SkeletonList from "../components/ui/loader/SkeletonList";
import PageFrame from "../components/layout/PageFrame";
import ComplianceClusterBarChart, {
  type ComplianceClusterDatum,
} from "../components/charts/ComplianceClusterBarChart";

import {
  getUserRole,
  isQA,
  isOfficeStaff,
  isOfficeHead,
} from "../lib/roleFilters";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const role = getUserRole();
  const myOfficeId = getCurrentUserOfficeId();

  const [docs, setDocs] = useState<Document[]>([]);
  const [assigned, setAssigned] = useState<WorkQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [docsData, wq] = await Promise.all([
          listDocuments(),
          getWorkQueue(),
        ]);
        setDocs(docsData);
        setAssigned(wq.assigned ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pending = useMemo<WorkQueueItem[]>(() => {
    // Only items the user can act on (assigned to their office)
    return (assigned ?? []).filter((x) => x?.can_act);
  }, [assigned]);

  const officialCount = useMemo(
    () => docs.filter((d) => d.status === "Distributed").length,
    [docs],
  );

  const myOfficeDocsCount = useMemo(() => {
    if (!(isOfficeStaff(role) || isOfficeHead(role))) return null;
    return docs.filter(
      (d) => Number((d as any).owner_office_id) === Number(myOfficeId),
    ).length;
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
    <PageFrame
      title="Dashboard"
      right={
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

          {isQA(role) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/reports")}
            >
              Open reports
            </Button>
          )}

          {isQA(role) ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate("/documents/create")}
            >
              Create document
            </Button>
          ) : isOfficeStaff(role) || isOfficeHead(role) ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate("/documents/create")}
            >
              Create document
            </Button>
          ) : null}
        </div>
      }
      contentClassName="space-y-6"
    >
      {error && <Alert variant="danger">{error}</Alert>}

      {isQA(role) && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Compliance snapshot
                </div>
                <div className="text-xs text-slate-600">
                  VP clusters + President (placeholder data for now).
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/reports")}
              >
                View reports
              </Button>
            </div>

            <div className="mt-4">
              <ComplianceClusterBarChart
                height={220}
                data={
                  [
                    { cluster: "VAd", assigned: 12, approved: 8, returned: 2 },
                    { cluster: "VA", assigned: 20, approved: 14, returned: 4 },
                    { cluster: "VF", assigned: 9, approved: 6, returned: 1 },
                    { cluster: "VR", assigned: 7, approved: 5, returned: 2 },
                    { cluster: "PO", assigned: 6, approved: 4, returned: 1 },
                  ] as ComplianceClusterDatum[]
                }
              />
            </div>
          </CardBody>
        </Card>
      )}

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
                {pending.slice(0, 5).map((x) => (
                  <button
                    key={x.version.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/documents/${x.document.id}?version_id=${x.version.id}`,
                      )
                    }
                    className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  >
                    <div className="font-medium">{x.document.title}</div>
                    <div className="text-xs text-slate-500">
                      {x.version.status}
                    </div>
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
    </PageFrame>
  );
};

export default DashboardPage;
