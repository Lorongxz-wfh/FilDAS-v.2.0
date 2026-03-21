import React, { useEffect, useState } from "react";
import PageFrame from "../components/layout/PageFrame";
import Alert from "../components/ui/Alert";
import ReportStatCard from "../components/reports/ReportStatCard";
import ReportChartCard from "../components/reports/ReportChartCard";
import VolumeTrendChart from "../components/charts/VolumeTrendChart";
import AdminUsersByRoleChart from "../components/dashboard/AdminUsersByRoleChart";
import AdminActivityBarChart from "../components/dashboard/AdminActivityBarChart";
import AdminDocumentPhaseChart from "../components/dashboard/AdminDocumentPhaseChart";
import {
  getComplianceReport,
  getAdminDashboardStats,
} from "../services/documents";
import type {
  ComplianceVolumeSeriesDatum,
  ComplianceOfficeDatum,
  AdminDashboardStats,
} from "../services/documents";
import DateRangeInput from "../components/ui/DateRangeInput";
import Skeleton from "../components/ui/loader/Skeleton";
import { selectCls } from "../utils/formStyles";
import {
  FileText,
  CheckCircle2,
  Activity,
  Clock,
  Users,
  Building2,
  RefreshCw,
} from "lucide-react";

type Tab = "overview" | "offices" | "users";
type Bucket = "daily" | "weekly" | "monthly" | "yearly" | "total";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "offices", label: "By Office" },
  { key: "users", label: "Users" },
];

// ── Office table ─────────────────────────────────────────────────────────────
const OfficeTable: React.FC<{ rows: ComplianceOfficeDatum[] }> = ({ rows }) => {
  const sorted = [...rows].sort((a, b) => b.in_review - a.in_review);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-surface-400">
            {["Office", "In review", "Approved", "Approval %", "Returned"].map((h) => (
              <th
                key={h}
                className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-surface-400">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No data for selected filters
              </td>
            </tr>
          ) : (
            sorted.map((row) => {
              const total = row.in_review + row.approved + row.returned;
              const approvalRate = total ? Math.round((row.approved / total) * 100) : 0;
              return (
                <tr key={row.office_id} className="hover:bg-slate-50 dark:hover:bg-surface-400 transition">
                  <td className="py-2.5 pr-6 font-medium text-slate-900 dark:text-slate-100">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1.5">
                      {row.office_code}
                    </span>
                  </td>
                  <td className="py-2.5 pr-6 tabular-nums text-slate-700 dark:text-slate-300">{row.in_review}</td>
                  <td className="py-2.5 pr-6 tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{row.approved}</td>
                  <td className="py-2.5 pr-6">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-surface-400">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${approvalRate}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">{approvalRate}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-6 tabular-nums text-rose-500 dark:text-rose-400">{row.returned}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const AdminReportsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("overview");
  const [bucket, setBucket] = useState<Bucket>("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [volumeSeries, setVolumeSeries] = useState<ComplianceVolumeSeriesDatum[]>([]);
  const [officeData, setOfficeData] = useState<ComplianceOfficeDatum[]>([]);
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [report, stats] = await Promise.all([
        getComplianceReport({
          bucket,
          scope: "offices",
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
        getAdminDashboardStats(),
      ]);
      setVolumeSeries(report.volume_series);
      setOfficeData(report.offices);
      setAdminStats(stats);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load report data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [bucket, dateFrom, dateTo]); // eslint-disable-line

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = dateFrom || dateTo;

  return (
    <PageFrame
      title="Reports"
      contentClassName="flex flex-col gap-4"
      right={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center justify-center h-8 w-8 rounded border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-400 disabled:opacity-40 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      }
    >
      {/* Filter bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <select
          value={bucket}
          onChange={(e) => setBucket(e.target.value as Bucket)}
          className={selectCls}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="total">Total</option>
        </select>

        <DateRangeInput
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-400 transition"
          >
            Clear
          </button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 border-b border-slate-200 dark:border-surface-400">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              "px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px",
              tab === t.key
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="flex flex-wrap gap-3">
            <ReportStatCard
              label="Total documents"
              value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.documents.total ?? 0)}
              sub={`${adminStats?.documents.distributed ?? 0} distributed`}
              color="default"
              icon={<FileText size={16} />}
            />
            <ReportStatCard
              label="Distributed"
              value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.documents.distributed ?? 0)}
              sub={adminStats?.documents.total ? `${Math.round((adminStats.documents.distributed / adminStats.documents.total) * 100)}% completion rate` : undefined}
              color="emerald"
              icon={<CheckCircle2 size={16} />}
            />
            <ReportStatCard
              label="In progress"
              value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.documents.in_progress ?? 0)}
              sub="Active workflows"
              color="sky"
              icon={<Activity size={16} />}
            />
            <ReportStatCard
              label="Total offices"
              value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.offices.total ?? 0)}
              sub={`${adminStats?.offices.active ?? 0} active`}
              color="violet"
              icon={<Building2 size={16} />}
            />
          </div>

          {/* Volume trend */}
          <ReportChartCard
            title="Document volume"
            subtitle="Created vs distributed per period."
          >
            {loading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : (
              <VolumeTrendChart data={volumeSeries} height={200} />
            )}
          </ReportChartCard>

          {/* Document phase breakdown */}
          <ReportChartCard
            title="Documents by phase"
            subtitle="Current workflow stage of all documents."
          >
            {loading ? (
              <Skeleton className="h-44 w-full rounded-xl" />
            ) : (
              <AdminDocumentPhaseChart
                byPhase={adminStats?.documents.by_phase}
                height={180}
              />
            )}
          </ReportChartCard>
        </div>
      )}

      {/* ── By Office tab ────────────────────────────────────────────────── */}
      {tab === "offices" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <ReportStatCard
              label="Total offices"
              value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.offices.total ?? 0)}
              sub={`${adminStats?.offices.active ?? 0} active`}
              color="default"
              icon={<Building2 size={16} />}
            />
            <ReportStatCard
              label="With active docs"
              value={loading ? <Skeleton className="h-8 w-12" /> : officeData.filter((o) => o.in_review + o.approved + o.returned > 0).length}
              sub="Offices participating"
              color="sky"
              icon={<FileText size={16} />}
            />
          </div>

          <ReportChartCard
            title="Office document breakdown"
            subtitle="Documents in review, approved, and returned per office."
          >
            {loading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <OfficeTable rows={officeData} />
            )}
          </ReportChartCard>
        </div>
      )}

      {/* ── Users tab ────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="flex flex-wrap gap-3">
            <ReportStatCard
              label="Total users"
              value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.users.total ?? 0)}
              color="default"
              icon={<Users size={16} />}
            />
            <ReportStatCard
              label="Active"
              value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.users.active ?? 0)}
              sub={adminStats?.users.total ? `${Math.round((adminStats.users.active / adminStats.users.total) * 100)}% of users` : undefined}
              color="emerald"
              icon={<CheckCircle2 size={16} />}
            />
            <ReportStatCard
              label="Inactive"
              value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.users.inactive ?? 0)}
              color="rose"
              icon={<Clock size={16} />}
            />
          </div>

          {/* Two charts side by side */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ReportChartCard
              title="User status"
              subtitle="Active vs inactive users."
            >
              {loading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : (
                <AdminUsersByRoleChart
                  active={adminStats?.users.active ?? 0}
                  inactive={adminStats?.users.inactive ?? 0}
                />
              )}
            </ReportChartCard>

            <ReportChartCard
              title="System activity"
              subtitle="Actions logged per month."
            >
              {loading ? (
                <Skeleton className="h-44 w-full rounded-xl" />
              ) : (
                <AdminActivityBarChart
                  data={adminStats?.activity_series ?? []}
                  height={180}
                />
              )}
            </ReportChartCard>
          </div>
        </div>
      )}
    </PageFrame>
  );
};

export default AdminReportsPage;
