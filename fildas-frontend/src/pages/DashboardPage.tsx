import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listDocuments,
  getWorkQueue,
  getComplianceReport,
  type WorkQueueItem,
} from "../services/documents";
import type { Document } from "../services/documents";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import SkeletonList from "../components/ui/loader/SkeletonList";
import StatCard from "../components/ui/StatCard";
import DocListItem from "../components/ui/DocListItem";
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

  const [docs, setDocs] = useState<Document[]>([]);
  const [assigned, setAssigned] = useState<WorkQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clusterData, setClusterData] = useState<ComplianceClusterDatum[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [docsData, wq, report] = await Promise.all([
          listDocuments(),
          getWorkQueue(),
          isQA(role)
            ? getComplianceReport()
            : Promise.resolve({
                clusters: [],
                offices: [],
                series: [],
                volume_series: [],
                kpis: {
                  total_created: 0,
                  total_approved_final: 0,
                  first_pass_yield_pct: 0,
                  pingpong_ratio: 0,
                  cycle_time_avg_days: 0,
                },
                stage_delays: [],
              }),
        ]);
        setDocs(docsData);
        setAssigned(wq.assigned ?? []);
        setClusterData(report.clusters ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pending = useMemo(
    () => (assigned ?? []).filter((x) => x?.can_act),
    [assigned],
  );
  const officialCount = useMemo(
    () => docs.filter((d) => d.status === "Distributed").length,
    [docs],
  );
  const recentOfficial = useMemo(
    () =>
      docs
        .filter((d) => d.status === "Distributed")
        .sort((a, b) =>
          String(b.updated_at).localeCompare(String(a.updated_at)),
        )
        .slice(0, 5),
    [docs],
  );
  const recentActive = useMemo(
    () =>
      [...docs]
        .sort((a, b) =>
          String(b.updated_at).localeCompare(String(a.updated_at)),
        )
        .slice(0, 5),
    [docs],
  );

  const canCreate = isQA(role) || isOfficeStaff(role) || isOfficeHead(role);

  return (
    <PageFrame
      title="Dashboard"
      right={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/work-queue")}
          >
            Work queue
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/documents")}
          >
            Library
          </Button>
          {isQA(role) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/reports")}
            >
              Reports
            </Button>
          )}
          {canCreate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/documents/create")}
            >
              + Create document
            </Button>
          )}
        </div>
      }
      contentClassName="space-y-6"
    >
      {error && <Alert variant="danger">{error}</Alert>}

      {/* QA: Stats + Chart */}
      {isQA(role) && (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
          <Card className="sm:w-56 sm:flex-none overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-surface-400">
              <StatCard
                label="Pending actions"
                value={pending.length}
                loading={loading}
                valueClassName="text-brand-300"
              />
              <StatCard
                label="Total documents"
                value={docs.length}
                loading={loading}
                valueClassName="text-slate-900 dark:text-slate-100"
              />
              <StatCard
                label="Official"
                value={officialCount}
                loading={loading}
                valueClassName="text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </Card>

          <Card className="sm:flex-1 min-w-0">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Workflow snapshot
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/reports")}
                >
                  View reports
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <ComplianceClusterBarChart height={240} data={clusterData} />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Pending actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pending actions
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Top items requiring your action.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/work-queue")}
            >
              View all
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-2 min-h-24">
            {loading ? (
              <SkeletonList rows={5} rowClassName="h-10" />
            ) : pending.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No pending actions right now.
              </p>
            ) : (
              pending
                .slice(0, 5)
                .map((x) => (
                  <DocListItem
                    key={x.version.id}
                    title={x.document.title}
                    subtitle={x.version.status}
                    onClick={() =>
                      navigate(
                        `/documents/${x.document.id}?version_id=${x.version.id}`,
                      )
                    }
                  />
                ))
            )}
          </div>
        </CardBody>
      </Card>

      {/* Recent cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Recent official
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Recently distributed documents.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/documents")}
              >
                Open library
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 min-h-24">
              {loading ? (
                <SkeletonList rows={4} rowClassName="h-10" />
              ) : recentOfficial.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No official versions yet.
                </p>
              ) : (
                recentOfficial.map((d) => (
                  <DocListItem
                    key={d.id}
                    title={d.title}
                    subtitle={d.code ?? "—"}
                    onClick={() => navigate(`/documents/${d.id}`)}
                  />
                ))
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent activity
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Latest updated documents.
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 min-h-24">
              {loading ? (
                <SkeletonList rows={4} rowClassName="h-10" />
              ) : recentActive.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No documents yet.
                </p>
              ) : (
                recentActive.map((d) => (
                  <DocListItem
                    key={d.id}
                    title={d.title}
                    subtitle={d.status}
                    onClick={() => navigate(`/documents/${d.id}`)}
                  />
                ))
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Recent comments
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Coming soon.
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-sm text-slate-500 dark:border-surface-400 dark:bg-surface-600 dark:text-slate-400">
              No comments yet.
            </div>
          </CardBody>
        </Card>
      </div>
    </PageFrame>
  );
};

export default DashboardPage;
