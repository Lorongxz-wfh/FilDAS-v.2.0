import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDocumentStats,
  getWorkQueue,
  listActivityLogs,
  getDocumentVersion,
} from "../services/documents";
import type { WorkQueueItem } from "../services/documents";
import PendingActionsSection from "../components/PendingActionsSection";
import {
  getUserRole,
  isQA,
  isOfficeStaff,
  isOfficeHead,
} from "../lib/roleFilters";

import Alert from "../components/ui/Alert";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageFrame from "../components/layout/PageFrame";
import InlineSpinner from "../components/ui/loader/InlineSpinner";
import SkeletonList from "../components/ui/loader/SkeletonList";

import { markWorkQueueSession } from "../lib/guards/RequireFromWorkQueue";

const MyWorkQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [assignedItems, setAssignedItems] = useState<WorkQueueItem[]>([]);
  const [monitoringItems, setMonitoringItems] = useState<WorkQueueItem[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    distributed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const formatWhen = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return String(iso);
    }
  };

  const [userRole] = useState(getUserRole());

  // Filter pending actions for this user
  // Backend stats handles the authoritative pending count.
  // This list is just “top items requiring your action”.

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const roleNow = getUserRole();

        const [s, a] = await Promise.all([
          getDocumentStats(),
          listActivityLogs({ scope: "mine", per_page: 10 }),
        ]);

        setStats(s);
        setRecentActivity((a as any)?.data ?? []);

        if (roleNow === "ADMIN") {
          // Admin has no office tasks; avoid /work-queue which 422s when office is null.
          setAssignedItems([]);
          setMonitoringItems([]);
        } else {
          const q = await getWorkQueue();
          setAssignedItems(q.assigned ?? []);
          setMonitoringItems(q.monitoring ?? []);
        }
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? "Failed to load work queue");
      } finally {
        if (!alive) return;
        setLoading(false);
        setLoadingActivity(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const handleDocumentSelect = (id: number) => {
    navigate(`/documents/${id}`);
  };

  const openByDocId = (docId: number) => {
    navigate(`/documents/${docId}`);
  };

  const openByVersionId = async (versionId: number) => {
    const { document } = await getDocumentVersion(versionId);
    navigate(`/documents/${document.id}`);
  };

  const openActivity = async (l: any) => {
    const verId = Number(l?.document_version_id ?? 0);
    const docId = Number(l?.document_id ?? 0);

    if (verId) return openByVersionId(verId);
    if (docId) return openByDocId(docId);
  };

  return (
    <PageFrame
      title="My Work Queue"
      right={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/documents")}
          >
            Open document library
          </Button>

          {isQA(userRole) && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                markWorkQueueSession();
                navigate("/documents/create", {
                  state: { fromWorkQueue: true },
                });
              }}
            >
              Create document
            </Button>
          )}

          {(isOfficeStaff(userRole) || isOfficeHead(userRole)) && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                markWorkQueueSession();
                navigate("/documents/create", {
                  state: { fromWorkQueue: true },
                });
              }}
            >
              Create document
            </Button>
          )}
        </div>
      }
      contentClassName="space-y-6"
    >
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Stats row */}
      <Card className="overflow-hidden">
        <CardBody className="bg-white p-0">
          <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-y-0 md:divide-x">
            <div className="text-center py-3">
              <div className="text-3xl font-semibold text-sky-700 tabular-nums">
                {loading ? (
                  <InlineSpinner className="h-5 w-5 border-2" />
                ) : (
                  (stats?.pending ?? 0)
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
                  (stats?.total ?? 0)
                )}
              </div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Total documents
              </div>
            </div>

            <div className="text-center py-3">
              <div className="text-2xl font-semibold text-emerald-700 tabular-nums">
                {loading ? (
                  <InlineSpinner className="h-5 w-5 border-2" />
                ) : (
                  (stats?.distributed ?? 0)
                )}
              </div>

              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Official
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Pending Actions */}
      <Card>
        <CardBody className="flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Pending actions
              </div>
              <div className="text-xs text-slate-600">
                Top items requiring your action.
              </div>
            </div>
          </div>

          <div className="mt-3">
            {loading ? (
              <div className="space-y-2">
                <SkeletonList rows={6} rowClassName="h-10" />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <PendingActionsSection
                  title="Assigned to me"
                  items={assignedItems}
                  onDocumentClick={handleDocumentSelect}
                  emptyText="No assigned tasks right now."
                />

                {isQA(userRole) && (
                  <PendingActionsSection
                    title="Monitoring"
                    items={monitoringItems}
                    onDocumentClick={handleDocumentSelect}
                    emptyText="No monitored documents right now."
                  />
                )}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Recent activity
              </div>
              <div className="text-xs text-slate-600">
                Your latest actions (proof log).
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/my-activity")}
            >
              View all activity
            </Button>
          </div>

          <div className="mt-3">
            {loadingActivity ? (
              <div className="space-y-2">
                <SkeletonList rows={6} rowClassName="h-10" />
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-slate-600">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.slice(0, 5).map((l: any) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => openActivity(l)}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {l.label || l.event}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {l.event}
                        </p>
                      </div>
                      <div className="shrink-0 text-[11px] text-slate-500">
                        {formatWhen(l.created_at)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </PageFrame>
  );
};

export default MyWorkQueuePage;
