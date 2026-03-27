import React, { useEffect, useState } from "react";
import PageFrame from "../components/layout/PageFrame";
import Alert from "../components/ui/Alert";
import RefreshButton from "../components/ui/RefreshButton";
import ReportStatCard from "../components/reports/ReportStatCard";
import ReportChartCard from "../components/reports/ReportChartCard";
import VolumeTrendChart from "../components/charts/VolumeTrendChart";
import PhaseDistributionChart from "../components/charts/PhaseDistributionChart";
import StageDelayChart from "../components/charts/StageDelayChart";
import DocumentTypeChart from "../components/charts/DocumentTypeChart";
import AdminUsersByRoleChart from "../components/dashboard/AdminUsersByRoleChart";
import AdminActivityBarChart from "../components/dashboard/AdminActivityBarChart";
import {
  getComplianceReport,
  getAdminDashboardStats,
} from "../services/documents";
import type {
  ComplianceKpis,
  ComplianceVolumeSeriesDatum,
  ComplianceOfficeDatum,
  ComplianceStageDelayDatum,
  AdminDashboardStats,
} from "../services/documents";
import Skeleton from "../components/ui/loader/Skeleton";
import { filterSelectCls } from "../utils/formStyles";
import {
  FileText,
  CheckCircle2,
  Activity,
  Clock,
  Users,
  Building2,
  SlidersHorizontal,
  X,
  Wifi,
  Percent,
  RotateCcw,
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [volumeSeries, setVolumeSeries] = useState<ComplianceVolumeSeriesDatum[]>([]);
  const [officeData, setOfficeData] = useState<ComplianceOfficeDatum[]>([]);
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [kpis, setKpis] = useState<ComplianceKpis>({ total_created: 0, total_approved_final: 0, first_pass_yield_pct: 0, pingpong_ratio: 0, cycle_time_avg_days: 0 });
  const [phaseDist, setPhaseDist] = useState<{ phase: string; count: number }[]>([]);
  const [stageDelays, setStageDelays] = useState<ComplianceStageDelayDatum[]>([]);
  const [doctypeDist, setDoctypeDist] = useState<{ doctype: string; count: number }[]>([]);

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
      setKpis((prev) => report.kpis ?? prev);
      setPhaseDist(report.phase_distribution ?? []);
      setStageDelays(report.stage_delays_by_phase ?? []);
      setDoctypeDist(report.doctype_distribution ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [bucket, dateFrom, dateTo, refreshKey]); // eslint-disable-line

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setBucket("monthly");
  };

  const activeFilterCount = [
    bucket !== "monthly",
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  const tabCls = (active: boolean) =>
    [
      "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px",
      active
        ? "border-brand-500 text-brand-600 dark:text-brand-400"
        : "border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300",
    ].join(" ");

  return (
    <PageFrame
      title="Reports"
      contentClassName="flex flex-col min-h-0 gap-0 h-full overflow-hidden"
      right={
        <RefreshButton
          loading={loading}
          onRefresh={async () => {
            setRefreshKey((k) => k + 1);
            return "Report data refreshed.";
          }}
          title="Refresh report"
        />
      }
    >
      {error && (
        <div className="shrink-0 px-4 pt-3">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      {/* Tab nav */}
      <div className="shrink-0 flex items-center border-b border-slate-200 dark:border-surface-400">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={tabCls(tab === t.key)}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center pr-3 -mb-px">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-500 transition-colors"
          >
            <SlidersHorizontal size={12} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-brand-400 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content + filter panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Scrollable main content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="flex flex-col gap-5 p-4 sm:p-5">

            {/* ── Overview tab ──────────────────────────────────────────────── */}
            {tab === "overview" && (
              <>
                {/* Row 1 — System stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <ReportStatCard
                    label="Documents created"
                    value={loading ? <Skeleton className="h-8 w-12" /> : kpis.total_created}
                    sub="In selected period"
                    color="default"
                    icon={<FileText size={16} />}
                  />
                  <ReportStatCard
                    label="Distributed"
                    value={loading ? <Skeleton className="h-8 w-12" /> : kpis.total_approved_final}
                    sub={kpis.total_created ? `${Math.round((kpis.total_approved_final / kpis.total_created) * 100)}% completion rate` : "In selected period"}
                    color="emerald"
                    icon={<CheckCircle2 size={16} />}
                  />
                  <ReportStatCard
                    label="In progress"
                    value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.documents.in_progress ?? 0)}
                    sub="Currently active"
                    color="sky"
                    icon={<Activity size={16} />}
                  />
                  <ReportStatCard
                    label="Total users"
                    value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.users.total ?? 0)}
                    sub={`${adminStats?.users.active ?? 0} accounts enabled`}
                    color="default"
                    icon={<Users size={16} />}
                  />
                  <ReportStatCard
                    label="Online now"
                    value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.users.online ?? 0)}
                    sub="Active in last 30 minutes"
                    color="emerald"
                    icon={<Wifi size={16} />}
                  />
                  <ReportStatCard
                    label="Total offices"
                    value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.offices.total ?? 0)}
                    sub={`${adminStats?.offices.active ?? 0} active`}
                    color="violet"
                    icon={<Building2 size={16} />}
                  />
                </div>

                {/* Row 2 — Quality KPI strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ReportStatCard
                    label="First-pass yield"
                    value={loading ? <Skeleton className="h-8 w-12" /> : `${kpis.first_pass_yield_pct}%`}
                    sub="Distributed with zero returns"
                    color="emerald"
                    icon={<Percent size={16} />}
                  />
                  <ReportStatCard
                    label="Avg cycle time"
                    value={loading ? <Skeleton className="h-8 w-12" /> : `${kpis.cycle_time_avg_days}d`}
                    sub="Draft to distributed"
                    color="sky"
                    icon={<Clock size={16} />}
                  />
                  <ReportStatCard
                    label="Ping-pong ratio"
                    value={loading ? <Skeleton className="h-8 w-12" /> : kpis.pingpong_ratio}
                    sub="Avg returns per document"
                    color="rose"
                    icon={<RotateCcw size={16} />}
                  />
                </div>

                {/* Row 3 — Volume trend + Phase donut */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <ReportChartCard
                      title={`Document volume · ${bucket}`}
                      subtitle="Created vs distributed per period."
                      loading={loading}
                    >
                      <VolumeTrendChart data={volumeSeries} height={220} loading={loading} />
                    </ReportChartCard>
                  </div>
                  <div className="lg:col-span-1">
                    <ReportChartCard
                      title="Documents by phase"
                      subtitle="Current status of documents in selected period."
                      loading={loading}
                    >
                      <PhaseDistributionChart
                        data={phaseDist}
                        variant="donut"
                        height={220}
                      />
                    </ReportChartCard>
                  </div>
                </div>

                {/* Row 4 — Stage delays + Doc type */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ReportChartCard
                    title="Stage delay by phase"
                    subtitle="Median task hold time per workflow phase."
                    loading={loading}
                  >
                    <StageDelayChart data={stageDelays} height={180} loading={loading} />
                  </ReportChartCard>
                  <ReportChartCard
                    title="Document type breakdown"
                    subtitle="Distribution by document category."
                    loading={loading}
                  >
                    <DocumentTypeChart data={doctypeDist} height={180} loading={loading} />
                  </ReportChartCard>
                </div>
              </>
            )}

            {/* ── By Office tab ─────────────────────────────────────────────── */}
            {tab === "offices" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  loading={loading}
                >
                  {loading ? (
                    <Skeleton className="h-64 w-full rounded-xl" />
                  ) : (
                    <OfficeTable rows={officeData} />
                  )}
                </ReportChartCard>
              </>
            )}

            {/* ── Users tab ─────────────────────────────────────────────────── */}
            {tab === "users" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ReportStatCard
                    label="Total users"
                    value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.users.total ?? 0)}
                    sub={`${adminStats?.users.active ?? 0} accounts enabled`}
                    color="default"
                    icon={<Users size={16} />}
                  />
                  <ReportStatCard
                    label="Online now"
                    value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.users.online ?? 0)}
                    sub="Active in the last 30 minutes"
                    color="emerald"
                    icon={<Wifi size={16} />}
                  />
                  <ReportStatCard
                    label="Disabled"
                    value={loading ? <Skeleton className="h-8 w-12" /> : (adminStats?.users.inactive ?? 0)}
                    sub="Accounts deactivated by admin"
                    color="rose"
                    icon={<Clock size={16} />}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ReportChartCard
                    title="Account status"
                    subtitle="Enabled vs disabled accounts."
                    loading={loading}
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
                    loading={loading}
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
              </>
            )}

          </div>
        </div>

        {/* Collapsible filter panel */}
        {filtersOpen && (
          <aside className="w-56 shrink-0 border-l border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-surface-400">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-brand-400 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-medium text-brand-500 dark:text-brand-400 hover:underline"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-5 p-4">

              {/* Group by */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Group by</p>
                <select value={bucket} onChange={(e) => setBucket(e.target.value as Bucket)} className={filterSelectCls}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="total">Total</option>
                </select>
              </div>

              {/* Date range */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Date range</p>
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">From</p>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={filterSelectCls}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">To</p>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={filterSelectCls}
                    />
                  </div>
                </div>
              </div>

            </div>
          </aside>
        )}
      </div>
    </PageFrame>
  );
};

export default AdminReportsPage;
