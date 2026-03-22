import React from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Tooltip from "../components/ui/Tooltip";
import Skeleton from "../components/ui/loader/Skeleton";

// Shared charts
import StatusDonutChart from "../components/charts/StatusDonutChart";
import ComplianceClusterBarChart from "../components/charts/ComplianceClusterBarChart";
import VolumeTrendChart from "../components/charts/VolumeTrendChart";
import StageDelayChart from "../components/charts/StageDelayChart";

// Shared dashboard components
import DashboardStatRow from "../components/dashboard/DashboardStatRow";
import DashboardPendingList from "../components/dashboard/DashboardPendingList";
import DashboardRecentActivity from "../components/dashboard/DashboardRecentActivity";

// Admin-only components
import AdminStatGrid from "../components/dashboard/AdminStatGrid";
import AdminUsersByRoleChart from "../components/dashboard/AdminUsersByRoleChart";
import AdminActivityBarChart from "../components/dashboard/AdminActivityBarChart";
import AdminDocumentPhaseChart from "../components/dashboard/AdminDocumentPhaseChart";

import { useDashboardData } from "../hooks/useDashboardData";
import { usePageBurstRefresh } from "../hooks/usePageBurstRefresh";
import { getUserRole, isQA } from "../lib/roleFilters";
import { getAuthUser } from "../lib/auth";
import {
  FolderOpen,
  ClipboardList,
  Inbox,
  Clock,
  RefreshCw,
} from "lucide-react";

// ─── Card ─────────────────────────────────────────────────────────────────
const Card: React.FC<{
  title: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
}> = ({ title, sub, action, children, className = "" }) => (
  <div
    className={`rounded-md border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500 ${className}`}
  >
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-surface-400 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
          {title}
        </p>
        {sub && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {sub}
          </p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 text-xs font-medium text-brand-500 hover:text-brand-400 dark:text-brand-400 transition-colors"
        >
          {action.label} →
        </button>
      )}
    </div>
    <div className="px-4 py-4">{children}</div>
  </div>
);

// ─── QA Dashboard ─────────────────────────────────────────────────────────
const QADashboard: React.FC<
  ReturnType<typeof useDashboardData> & {
    navigate: ReturnType<typeof useNavigate>;
  }
> = ({
  stats,
  pending,
  recentActivity,
  report,
  pendingRequestsCount,
  loading,
  navigate,
}) => {
  const donutSegments = [
    { label: "Distributed", value: stats?.distributed ?? 0, color: "#10b981" },
    { label: "In progress", value: stats?.pending ?? 0, color: "#f59e0b" },
    {
      label: "Draft / other",
      value: Math.max(
        0,
        (stats?.total ?? 0) - (stats?.distributed ?? 0) - (stats?.pending ?? 0),
      ),
      color: "#94a3b8",
    },
  ];

  return (
    <div className="space-y-4">
      <DashboardStatRow
        role="QA"
        stats={stats}
        pendingCount={pending.length}
        pendingRequestsCount={pendingRequestsCount}
        loading={loading}
      />

      {/* Row 1: Volume trend + Status donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Document volume"
          sub="Created vs approved per month."
          action={{
            label: "Full reports",
            onClick: () => navigate("/reports"),
          }}
          className="lg:col-span-2"
        >
          {loading ? (
            <Skeleton className="h-44 w-full rounded" />
          ) : (
            <VolumeTrendChart data={report.volume_series} height={176} />
          )}
        </Card>

        <Card
          title="Document summary"
          sub="Status breakdown."
          action={{
            label: "Open library",
            onClick: () => navigate("/documents"),
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Skeleton className="h-36 w-36 rounded-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ) : (
            <StatusDonutChart
              segments={donutSegments}
              centerValue={stats?.total ?? 0}
              centerLabel="total"
              size={148}
            />
          )}
        </Card>
      </div>

      {/* KPI strip */}
      {(report.kpis || loading) && (
        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "Avg cycle time",
              value: report.kpis?.cycle_time_avg_days.toFixed(1) ?? "—",
              suffix: "d",
              color: "text-violet-600 dark:text-violet-400",
            },
            {
              label: "First-pass yield",
              value: report.kpis?.first_pass_yield_pct.toFixed(1) ?? "—",
              suffix: "%",
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Ping-pong ratio",
              value: report.kpis?.pingpong_ratio.toFixed(2) ?? "—",
              suffix: "×",
              color: "text-amber-600 dark:text-amber-400",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="flex items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 dark:border-surface-400 dark:bg-surface-500"
            >
              {loading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <>
                  <span
                    className={`text-base font-bold tabular-nums ${kpi.color}`}
                  >
                    {kpi.value}
                    <span className="ml-0.5 text-xs font-normal">
                      {kpi.suffix}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {kpi.label}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Row 2: Stage delay + Cluster */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Stage delay"
          sub="Average processing time per workflow stage."
          action={{
            label: "Full reports",
            onClick: () => navigate("/reports"),
          }}
        >
          {loading ? (
            <Skeleton className="h-44 w-full rounded" />
          ) : (
            <StageDelayChart
              data={report.stage_delays.filter(
                (s) => s.count > 0 || s.avg_hours > 0,
              )}
              height={176}
            />
          )}
        </Card>

        <Card
          title="Workflow by cluster"
          sub="Document status per office cluster."
          action={{
            label: "Full reports",
            onClick: () => navigate("/reports"),
          }}
        >
          {loading ? (
            <Skeleton className="h-44 w-full rounded" />
          ) : (
            <ComplianceClusterBarChart
              height={176}
              data={report.clusters.filter(
                (c) => c.in_review + c.sent_to_qa + c.approved + c.returned > 0,
              )}
            />
          )}
        </Card>
      </div>

      {/* Row 3: Pending + Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPendingList items={pending} loading={loading} />
        <Card
          title="Recent activity"
          sub="Latest actions in the system."
          action={{
            label: "View all",
            onClick: () => navigate("/activity-logs"),
          }}
        >
          <DashboardRecentActivity logs={recentActivity} loading={loading} />
        </Card>
      </div>
    </div>
  );
};

// ─── Office Dashboard ──────────────────────────────────────────────────────
const OfficeDashboard: React.FC<
  ReturnType<typeof useDashboardData> & {
    navigate: ReturnType<typeof useNavigate>;
    role: ReturnType<typeof getUserRole>;
  }
> = ({ stats, pending, recentActivity, loading, navigate, role }) => {
  const donutSegments = [
    { label: "Distributed", value: stats?.distributed ?? 0, color: "#10b981" },
    { label: "In progress", value: stats?.pending ?? 0, color: "#f59e0b" },
    {
      label: "Draft / other",
      value: Math.max(
        0,
        (stats?.total ?? 0) - (stats?.distributed ?? 0) - (stats?.pending ?? 0),
      ),
      color: "#94a3b8",
    },
  ];

  return (
    <div className="space-y-4">
      <DashboardStatRow
        role={role}
        stats={stats}
        pendingCount={pending.length}
        pendingRequestsCount={0}
        loading={loading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="My document summary"
          sub="Status of documents assigned to your office."
          action={{
            label: "Open library",
            onClick: () => navigate("/documents"),
          }}
        >
          {loading ? (
            <div className="flex items-center gap-6">
              <Skeleton className="h-40 w-40 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ) : (
            <StatusDonutChart
              segments={donutSegments}
              centerValue={stats?.total ?? 0}
              centerLabel="total"
              size={160}
            />
          )}
        </Card>

        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                label: "My documents",
                path: "/documents",
                icon: FolderOpen,
                iconCls: "text-sky-500 bg-sky-50 dark:bg-sky-950/40",
              },
              {
                label: "Work queue",
                path: "/work-queue",
                icon: ClipboardList,
                iconCls: "text-brand-500 bg-brand-50 dark:bg-brand-950/30",
              },
              {
                label: "Doc requests",
                path: "/document-requests",
                icon: Inbox,
                iconCls: "text-violet-500 bg-violet-50 dark:bg-violet-950/40",
              },
              {
                label: "Activity logs",
                path: "/activity-logs",
                icon: Clock,
                iconCls: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:border-surface-400 dark:bg-surface-600 dark:hover:bg-surface-400"
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${item.iconCls}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPendingList items={pending} loading={loading} />
        <Card
          title="Recent activity"
          sub="Latest actions in the system."
          action={{
            label: "View all",
            onClick: () => navigate("/activity-logs"),
          }}
        >
          <DashboardRecentActivity logs={recentActivity} loading={loading} />
        </Card>
      </div>
    </div>
  );
};

// ─── Admin Dashboard ───────────────────────────────────────────────────────
const AdminDashboard: React.FC<
  ReturnType<typeof useDashboardData> & {
    navigate: ReturnType<typeof useNavigate>;
  }
> = ({ adminStats, recentActivity, loading, navigate }) => (
  <div className="space-y-4">
    <AdminStatGrid data={adminStats} loading={loading} />

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card
        title="Documents by phase"
        sub="Current workflow stage of all documents."
        action={{
          label: "Open library",
          onClick: () => navigate("/documents"),
        }}
        className="lg:col-span-2"
      >
        {loading ? (
          <Skeleton className="h-44 w-full rounded" />
        ) : (
          <AdminDocumentPhaseChart
            byPhase={adminStats?.documents.by_phase}
            height={176}
          />
        )}
      </Card>

      <Card
        title="Users by role"
        sub="Role distribution."
        action={{
          label: "Manage users",
          onClick: () => navigate("/user-manager"),
        }}
      >
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        ) : (
          <AdminUsersByRoleChart
            active={adminStats?.users.active ?? 0}
            inactive={adminStats?.users.inactive ?? 0}
          />
        )}
      </Card>
    </div>

    <Card
      title="System activity"
      sub="Total actions logged per month."
      action={{
        label: "View all activity",
        onClick: () => navigate("/activity-logs"),
      }}
    >
      {loading ? (
        <Skeleton className="h-44 w-full rounded" />
      ) : (
        <AdminActivityBarChart
          data={adminStats?.activity_series ?? []}
          height={176}
        />
      )}
    </Card>

    <Card
      title="Recent activity"
      sub="Latest actions across the system."
      action={{ label: "View all", onClick: () => navigate("/activity-logs") }}
    >
      <DashboardRecentActivity logs={recentActivity} loading={loading} />
    </Card>
  </div>
);

// ─── Root ──────────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const role = getUserRole();
  const dashData = useDashboardData(role);
  const { loading, error } = dashData;
  const isAdmin = role === "ADMIN" || role === "SYSADMIN";
  const { refresh, refreshing } = usePageBurstRefresh(dashData.reload);

  const user = getAuthUser();
  const firstName =
    user?.first_name?.trim() || user?.full_name?.split(" ")[0] || "there";
  const initials =
    (user?.full_name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const pendingCount = dashData.pending.length;

  return (
    <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
      {/* ── Page header ── */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 dark:border-surface-400 dark:bg-surface-600 px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Left: avatar + greeting */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md overflow-hidden bg-slate-100 dark:bg-surface-400 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-surface-300">
              {(user as any)?.profile_photo_url ? (
                <img
                  src={(user as any).profile_photo_url}
                  alt={user?.full_name ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Dashboard &middot; {today}
              </p>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {greeting}, {firstName}
              </h1>
            </div>
          </div>

          {/* Right: status badge + refresh */}
          <div className="flex shrink-0 items-center gap-2">
            {!loading &&
              (pendingCount > 0 ? (
                <div className="hidden sm:flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-2.5 py-1 dark:border-rose-800 dark:bg-rose-950/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    {pendingCount} pending
                  </span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    All caught up
                  </span>
                </div>
              ))}

            <Tooltip text="Refresh dashboard" side="bottom">
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing || loading}
                className="cursor-pointer flex items-center justify-center h-8 w-8 rounded border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-400 disabled:opacity-40 transition-colors"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}

          {isAdmin ? (
            <AdminDashboard {...dashData} navigate={navigate} />
          ) : isQA(role) ? (
            <QADashboard {...dashData} navigate={navigate} />
          ) : (
            <OfficeDashboard {...dashData} navigate={navigate} role={role} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
