import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthUser } from "../hooks/useAuthUser";
import { getUserRole, isQA } from "../lib/roleFilters";
import PageFrame from "../components/layout/PageFrame";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import RefreshButton from "../components/ui/RefreshButton";
import ReportStatCard from "../components/reports/ReportStatCard";
import ReportChartCard from "../components/reports/ReportChartCard";
import { type ComplianceClusterDatum } from "../components/charts/ComplianceClusterBarChart";
import VolumeTrendChart from "../components/charts/VolumeTrendChart";
import StageDelayChart from "../components/charts/StageDelayChart";
import PhaseDistributionChart, {
  type PhaseDistributionVariant,
} from "../components/charts/PhaseDistributionChart";
import ReturnByStageChart, {
  type ReturnByStageVariant,
} from "../components/charts/ReturnByStageChart";
import BottleneckChart from "../components/charts/BottleneckChart";
import RequestFunnelChart from "../components/charts/RequestFunnelChart";
import SubmissionAttemptsChart from "../components/charts/SubmissionAttemptsChart";
import {
  getComplianceReport,
  getFlowHealthReport,
  getRequestsReport,
  type ComplianceOfficeDatum,
  type ComplianceVolumeSeriesDatum,
  type ComplianceKpis,
  type ComplianceStageDelayDatum,
  type FlowHealthReport,
  type RequestsReport,
} from "../services/documents";
import {
  exportElementPdf,
  exportFullTabPdf,
  exportVolumeCsv,
  exportClusterCsv,
  exportOfficeCsv,
  exportStageDelayCsv,
} from "../services/reportExport";
import {
  FileText,
  CheckCircle2,
  RotateCcw,
  Timer,
  ArrowLeftRight,
  ClipboardList,
  Crosshair,
  Inbox,
  GitBranch,
  Layers,
  Users,
  AlertCircle,
  Eye,
  Clock,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { filterSelectCls } from "../utils/formStyles";

// ── Types ──────────────────────────────────────────────────────────────────────

type Bucket = "daily" | "weekly" | "monthly" | "yearly" | "total";
type Parent = "ALL" | "PO" | "VAd" | "VA" | "VF" | "VR";
type DateField = "completed" | "created";
type Scope = "clusters" | "offices";
type Tab = "overview" | "workflow" | "requests";

// ── Helpers ────────────────────────────────────────────────────────────────────

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

const TABS_QA: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "workflow", label: "Workflow" },
  { key: "requests", label: "Requests" },
];

const TABS_ADMIN: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "requests", label: "Requests" },
];

const REQUEST_STATUS_COLORS: Record<string, string> = {
  Open: "#38bdf8",
  Closed: "#34d399",
  Cancelled: "#f43f5e",
};


// ── Compliance table ───────────────────────────────────────────────────────────

const ComplianceTable: React.FC<{
  rows: {
    key: string;
    label: string;
    in_review: number;
    approved: number;
    returned: number;
    approvalRate: number;
    returnRate: number;
  }[];
  colLabel: string;
}> = ({ rows, colLabel }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 dark:border-surface-400">
          {[
            colLabel,
            "In review",
            "Approved",
            "Approval %",
            "Returned",
            "Return %",
          ].map((h) => (
            <th
              key={h}
              className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              className="py-8 text-center text-sm text-slate-400 dark:text-slate-500"
            >
              No data for selected filters.
            </td>
          </tr>
        ) : (
          rows.map((x) => (
            <tr
              key={x.key}
              className="border-b border-slate-100 dark:border-surface-400 last:border-0"
            >
              <td className="py-3 pr-6 font-semibold text-slate-900 dark:text-slate-100">
                {x.label}
              </td>
              <td className="py-3 pr-6 tabular-nums text-slate-600 dark:text-slate-400">
                {x.in_review}
              </td>
              <td className="py-3 pr-6 tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                {x.approved}
              </td>
              <td className="py-3 pr-6">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-surface-400 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${x.approvalRate}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">
                    {x.approvalRate}%
                  </span>
                </div>
              </td>
              <td className="py-3 pr-6 tabular-nums font-medium text-rose-600 dark:text-rose-400">
                {x.returned}
              </td>
              <td className="py-3 pr-6">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-surface-400 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${x.returnRate}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">
                    {x.returnRate}%
                  </span>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// ── Bottleneck table ───────────────────────────────────────────────────────────

const BottleneckTable: React.FC<{ data: { office: string; avg_hours: number; task_count: number }[] }> = ({ data }) => {
  const sorted = [...data].sort((a, b) => b.avg_hours - a.avg_hours);
  const maxHours = sorted[0]?.avg_hours ?? 1;

  const textCls = (h: number) =>
    h >= 72
      ? "text-rose-600 dark:text-rose-400"
      : h >= 48
        ? "text-amber-600 dark:text-amber-400"
        : "text-sky-600 dark:text-sky-400";

  const barCls = (h: number) =>
    h >= 72 ? "bg-rose-500" : h >= 48 ? "bg-amber-500" : "bg-sky-500";

  const statusLabel = (h: number) =>
    h >= 72 ? "Critical" : h >= 48 ? "Slow" : "Normal";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-surface-400">
            {["Office", "Active tasks", "Avg hold time", "Status"].map((h) => (
              <th
                key={h}
                className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.office}
              className="border-b border-slate-100 dark:border-surface-400 last:border-0"
            >
              <td className="py-3 pr-6 font-semibold text-slate-900 dark:text-slate-100">
                {row.office}
              </td>
              <td className="py-3 pr-6 tabular-nums text-slate-600 dark:text-slate-400">
                {row.task_count}
              </td>
              <td className="py-3 pr-6">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-surface-400 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barCls(row.avg_hours)}`}
                      style={{ width: `${(row.avg_hours / maxHours) * 100}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">
                    {row.avg_hours}h
                  </span>
                </div>
              </td>
              <td
                className={`py-3 pr-6 text-xs font-semibold ${textCls(row.avg_hours)}`}
              >
                {statusLabel(row.avg_hours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const me = useAuthUser();
  const role = getUserRole();
  const qaMode = isQA(role);
  const TABS = qaMode ? TABS_QA : TABS_ADMIN;

  const tabContentRef = React.useRef<HTMLDivElement>(null);
  const [tabExporting, setTabExporting] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const handleExportTab = async () => {
    if (!tabContentRef.current) return;
    setTabExporting(true);
    try {
      await exportFullTabPdf(tabContentRef.current, activeTab);
    } finally {
      setTabExporting(false);
    }
  };

  const chartPdfHandler =
    (filename: string) => async (element: HTMLElement) => {
      await exportElementPdf(
        element,
        filename,
        filename.replace("fildas_", "").replace(".pdf", "").replace(/_/g, " "),
      );
    };

  // ── Filter state ─────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = React.useState<Tab>("overview");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [bucket, setBucket] = React.useState<Bucket>("monthly");
  const [parent, setParent] = React.useState<Parent>("ALL");
  const [dateField, setDateField] = React.useState<DateField>("completed");
  const [scope, setScope] = React.useState<Scope>("clusters");

  // ── API data ──────────────────────────────────────────────────────────────────

  const [officeData, setOfficeData] = React.useState<ComplianceOfficeDatum[]>([]);
  const [clusterData, setClusterData] = React.useState<ComplianceClusterDatum[]>([]);
  const [volumeSeries, setVolumeSeries] = React.useState<ComplianceVolumeSeriesDatum[]>([]);
  const [kpis, setKpis] = React.useState<ComplianceKpis>({
    total_created: 0,
    total_approved_final: 0,
    first_pass_yield_pct: 0,
    pingpong_ratio: 0,
    cycle_time_avg_days: 0,
  });
  const [phaseDist, setPhaseDist] = React.useState<{ phase: string; count: number }[]>([]);
  const [waitingOnQa, setWaitingOnQa] = React.useState(0);
  const [revisionStats, setRevisionStats] = React.useState({ docs_on_v2_plus: 0, avg_versions: 0 });
  const [routingSplit, setRoutingSplit] = React.useState({ default_flow: 0, custom_flow: 0 });
  const [inReviewCount, setInReviewCount] = React.useState(0);
  const [inApprovalCount, setInApprovalCount] = React.useState(0);
  const [stageDelaysDefault, setStageDelaysDefault] = React.useState<ComplianceStageDelayDatum[]>([]);
  const [stageDelaysCustom, setStageDelaysCustom] = React.useState<ComplianceStageDelayDatum[]>([]);
  const [flowHealth, setFlowHealth] = React.useState<FlowHealthReport>({
    return_by_stage: [],
    return_trend: [],
    bottleneck: [],
  });
  const [requestsReport, setRequestsReport] = React.useState<RequestsReport>({
    kpis: { total: 0, open: 0, closed: 0, cancelled: 0, acceptance_rate: 0, avg_resubmissions: 0, overdue: 0 },
    status_distribution: [],
    funnel: [],
    attempt_distribution: [],
    mode_split: { multi_office: 0, multi_doc: 0 },
    volume_series: [],
    office_acceptance: [],
  });

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!me) return;
        setLoading(true);
        setLoadError(null);
        const params = {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          date_field: dateField,
          bucket,
          scope,
          parent,
        };
        const [report, fh, rr] = await Promise.all([
          getComplianceReport(params),
          qaMode ? getFlowHealthReport({ date_from: dateFrom || undefined, date_to: dateTo || undefined, date_field: dateField, parent, bucket }) : null,
          getRequestsReport({ date_from: dateFrom || undefined, date_to: dateTo || undefined, bucket }),
        ]);
        if (!alive) return;
        setClusterData((report.clusters ?? []) as ComplianceClusterDatum[]);
        setOfficeData(report.offices ?? []);
        setVolumeSeries(report.volume_series ?? []);
        setKpis(report.kpis ?? { total_created: 0, total_approved_final: 0, first_pass_yield_pct: 0, pingpong_ratio: 0, cycle_time_avg_days: 0 });
        setPhaseDist(report.phase_distribution ?? []);
        setWaitingOnQa(report.waiting_on_qa ?? 0);
        setRevisionStats(report.revision_stats ?? { docs_on_v2_plus: 0, avg_versions: 0 });
        setRoutingSplit(report.routing_split ?? { default_flow: 0, custom_flow: 0 });
        setInReviewCount(report.in_review_count ?? 0);
        setInApprovalCount(report.in_approval_count ?? 0);
        setStageDelaysDefault(report.stage_delays_default ?? []);
        setStageDelaysCustom(report.stage_delays_custom ?? []);
        if (fh) setFlowHealth(fh);
        if (rr) setRequestsReport(rr);
      } catch (err: any) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load report");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [me, dateFrom, dateTo, bucket, parent, dateField, scope, refreshKey, qaMode]);

  if (!me) return <Navigate to="/login" replace />;

  // ── Derived ───────────────────────────────────────────────────────────────────

  const totals = clusterData.reduce(
    (acc, x) => {
      acc.in_review += x.in_review;
      acc.sent_to_qa += x.sent_to_qa;
      acc.approved += x.approved;
      acc.returned += x.returned;
      return acc;
    },
    { in_review: 0, sent_to_qa: 0, approved: 0, returned: 0 },
  );

  const rankedClusters = clusterData
    .map((x) => ({
      key: x.cluster,
      label: x.cluster,
      in_review: x.in_review,
      approved: x.approved,
      returned: x.returned,
      approvalRate: pct(x.approved, x.in_review),
      returnRate: pct(x.returned, x.in_review),
    }))
    .sort((a, b) => a.approvalRate - b.approvalRate);

  const rankedOffices = officeData
    .map((x) => ({
      key: String(x.office_id),
      label: x.office_code ?? `Office #${x.office_id}`,
      in_review: x.in_review,
      approved: x.approved,
      returned: x.returned,
      approvalRate: pct(x.approved, x.in_review),
      returnRate: pct(x.returned, x.in_review),
    }))
    .sort((a, b) => a.approvalRate - b.approvalRate);

  // Distribution coverage: of docs that reached finalization or beyond, how many were distributed?
  const finalizationCount = phaseDist.find((p) => p.phase === "Finalization")?.count ?? 0;
  const distributionCoverage = pct(kpis.total_approved_final, kpis.total_approved_final + finalizationCount);

  const tabCls = (active: boolean) =>
    [
      "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px",
      active
        ? "border-sky-500 text-sky-600 dark:text-sky-400"
        : "border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300",
    ].join(" ");

  const requestModeTotal =
    requestsReport.mode_split.multi_office + requestsReport.mode_split.multi_doc;

  const routingTotal = routingSplit.default_flow + routingSplit.custom_flow;

  const hasActiveFilters =
    parent !== "ALL" || dateFrom !== "" || dateTo !== "" || bucket !== "monthly" || dateField !== "completed";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <PageFrame
      title="Reports"
      contentClassName="flex flex-col min-h-0 gap-0 h-full overflow-hidden"
      right={
        <div className="flex items-center gap-2">
          <RefreshButton
            loading={loading}
            onRefresh={async () => {
              setRefreshKey((k) => k + 1);
              return "Report data refreshed.";
            }}
            title="Refresh report"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportTab}
            disabled={tabExporting}
          >
            {tabExporting ? "Exporting…" : "Export tab"}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate("/reports/export")}
          >
            Export reports
          </Button>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="relative flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-500 transition-colors"
          >
            <SlidersHorizontal size={13} />
            Filters
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-sky-500" />
            )}
          </button>
        </div>
      }
    >
      {/* Error */}
      {loadError && (
        <div className="shrink-0 px-4 pt-3">
          <Alert variant="danger">{loadError}</Alert>
        </div>
      )}

      {/* Tab nav */}
      <div className="shrink-0 flex items-center border-b border-slate-200 dark:border-surface-400">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={tabCls(activeTab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content area: charts + optional filter panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tab content */}
        <div ref={tabContentRef} className="flex-1 min-w-0 overflow-y-auto">
          <div className="flex flex-col gap-5 p-4 sm:p-5">

          {/* ── Overview ──────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <>
              {/* KPI row */}
              <div
                className={`grid gap-3 ${qaMode ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-2 sm:grid-cols-3"}`}
              >
                <ReportStatCard
                  label="Total created"
                  value={kpis.total_created}
                  sub="All versions in period"
                  icon={<FileText size={16} />}
                />
                <ReportStatCard
                  label="Distributed"
                  value={kpis.total_approved_final}
                  sub={`${pct(kpis.total_approved_final, kpis.total_created)}% completion rate`}
                  color="emerald"
                  icon={<CheckCircle2 size={16} />}
                />
                <ReportStatCard
                  label="Avg cycle time"
                  value={`${kpis.cycle_time_avg_days}d`}
                  sub="Draft → distribution"
                  color="violet"
                  icon={<Timer size={16} />}
                />
                {qaMode && (
                  <>
                    <ReportStatCard
                      label="Waiting on QA"
                      value={waitingOnQa}
                      sub="Tasks in QA's queue now"
                      color="amber"
                      icon={<Inbox size={16} />}
                    />
                    <ReportStatCard
                      label="Ping-pong ratio"
                      value={kpis.pingpong_ratio}
                      sub="Returns per version (avg)"
                      color={kpis.pingpong_ratio > 1 ? "rose" : "default"}
                      icon={<ArrowLeftRight size={16} />}
                    />
                  </>
                )}
              </div>

              {/* Phase distribution — all 4 variants */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {(
                  [
                    "donut",
                    "stacked-bar",
                    "stat-cards",
                    "vertical-bar",
                  ] as PhaseDistributionVariant[]
                ).map((v) => (
                  <ReportChartCard
                    key={v}
                    title={`Phase distribution — ${v}`}
                    subtitle="Live snapshot of active documents by phase"
                  >
                    <PhaseDistributionChart
                      data={phaseDist}
                      variant={v}
                      height={220}
                    />
                  </ReportChartCard>
                ))}
              </div>

              {/* Volume trend — full width */}
              <ReportChartCard
                title={`Document volume (${bucket})`}
                subtitle="Created vs distributed per period"
                onExportCsv={() => exportVolumeCsv(volumeSeries)}
                onExportPdf={chartPdfHandler("fildas_volume_trend.pdf")}
              >
                <VolumeTrendChart data={volumeSeries} height={240} />
              </ReportChartCard>

              {/* Stage delay — Default vs Custom flow */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ReportChartCard
                  title="Stage delay — Default flow"
                  subtitle="Avg hours per stage (standard routing)"
                  onExportCsv={() => exportStageDelayCsv(stageDelaysDefault)}
                  onExportPdf={chartPdfHandler("fildas_stage_delays_default.pdf")}
                >
                  {stageDelaysDefault.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                      No data for selected filters.
                    </p>
                  ) : (
                    <StageDelayChart data={stageDelaysDefault} height={220} />
                  )}
                </ReportChartCard>
                <ReportChartCard
                  title="Stage delay — Custom flow"
                  subtitle="Avg hours per stage (custom routing)"
                  onExportCsv={() => exportStageDelayCsv(stageDelaysCustom)}
                  onExportPdf={chartPdfHandler("fildas_stage_delays_custom.pdf")}
                >
                  {stageDelaysCustom.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                      No data for selected filters.
                    </p>
                  ) : (
                    <StageDelayChart data={stageDelaysCustom} height={220} />
                  )}
                </ReportChartCard>
              </div>

              {/* Routing split + Compliance cluster section (QA only) */}
              {qaMode && (
                <>
                  {/* Routing mode split */}
                  <div className="grid grid-cols-2 gap-3">
                    <ReportStatCard
                      label="Default flow"
                      value={routingSplit.default_flow}
                      sub={`${pct(routingSplit.default_flow, routingTotal)}% of all documents`}
                      color="sky"
                      icon={<ClipboardList size={16} />}
                    />
                    <ReportStatCard
                      label="Custom flow"
                      value={routingSplit.custom_flow}
                      sub={`${pct(routingSplit.custom_flow, routingTotal)}% of all documents`}
                      color="violet"
                      icon={<GitBranch size={16} />}
                    />
                  </div>

                  {/* Compliance cluster KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ReportStatCard
                      label="First-pass yield"
                      value={`${kpis.first_pass_yield_pct}%`}
                      sub="Approved with zero returns"
                      color="sky"
                      icon={<Crosshair size={16} />}
                    />
                    <ReportStatCard
                      label="Distribution coverage"
                      value={`${distributionCoverage}%`}
                      sub="Finalized docs that were distributed"
                      color="emerald"
                      icon={<CheckCircle2 size={16} />}
                    />
                    <ReportStatCard
                      label="Returned for edits"
                      value={totals.returned}
                      sub={`${pct(totals.returned, totals.in_review)}% return rate`}
                      color="rose"
                      icon={<RotateCcw size={16} />}
                    />
                    <ReportStatCard
                      label="Avg approval rate"
                      value={`${pct(totals.approved, totals.in_review)}%`}
                      sub="Across all clusters"
                      color={pct(totals.approved, totals.in_review) >= 70 ? "emerald" : "amber"}
                      icon={<ClipboardList size={16} />}
                    />
                  </div>

                  {/* Cluster / Office throughput table */}
                  <ReportChartCard
                    title={
                      scope === "clusters"
                        ? "Cluster throughput breakdown"
                        : "Office compliance breakdown"
                    }
                    subtitle="Sorted by approval rate — lowest first (highest risk at top)"
                    onExportCsv={
                      scope === "clusters"
                        ? () => exportClusterCsv(clusterData)
                        : () => exportOfficeCsv(officeData)
                    }
                    onExportPdf={chartPdfHandler(
                      scope === "clusters"
                        ? "fildas_cluster_table.pdf"
                        : "fildas_office_compliance.pdf",
                    )}
                  >
                    <ComplianceTable
                      rows={scope === "clusters" ? rankedClusters : rankedOffices}
                      colLabel={scope === "clusters" ? "Cluster" : "Office"}
                    />
                  </ReportChartCard>
                </>
              )}
            </>
          )}

          {/* ── Workflow (QA only) ─────────────────────────────────────────── */}
          {activeTab === "workflow" && qaMode && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ReportStatCard
                  label="In review"
                  value={inReviewCount}
                  sub="Open tasks in review phase"
                  color="sky"
                  icon={<Eye size={16} />}
                />
                <ReportStatCard
                  label="In approval"
                  value={inApprovalCount}
                  sub="Open tasks in approval phase"
                  color="violet"
                  icon={<Clock size={16} />}
                />
                <ReportStatCard
                  label="Docs on v2+"
                  value={revisionStats.docs_on_v2_plus}
                  sub="Revised at least once"
                  color="amber"
                  icon={<GitBranch size={16} />}
                />
                <ReportStatCard
                  label="Avg versions"
                  value={revisionStats.avg_versions}
                  sub="Versions before completion"
                  icon={<RotateCcw size={16} />}
                />
              </div>

              {/* Return by stage — all 4 variants */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {(
                  [
                    "horizontal",
                    "grouped",
                    "table",
                    "line",
                  ] as ReturnByStageVariant[]
                ).map((v) => (
                  <ReportChartCard
                    key={v}
                    title={`Returns by stage — ${v}`}
                    subtitle="Where documents get sent back most"
                  >
                    <ReturnByStageChart
                      data={flowHealth.return_by_stage}
                      trendData={flowHealth.return_trend}
                      variant={v}
                      height={240}
                    />
                  </ReportChartCard>
                ))}
              </div>

              {/* Bottleneck chart + table */}
              <ReportChartCard
                title="Office bottleneck analysis"
                subtitle="Ranked by avg hours held — red ≥ 72h · amber ≥ 48h · sky = normal"
              >
                <BottleneckChart data={flowHealth.bottleneck} height={220} />
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-surface-400">
                  <BottleneckTable data={flowHealth.bottleneck} />
                </div>
              </ReportChartCard>
            </>
          )}

          {/* ── Requests ──────────────────────────────────────────────────── */}
          {activeTab === "requests" && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ReportStatCard
                  label="Total requests"
                  value={requestsReport.kpis.total}
                  sub={`${requestsReport.kpis.open} open · ${requestsReport.kpis.cancelled} cancelled`}
                  icon={<Layers size={16} />}
                />
                <ReportStatCard
                  label="Acceptance rate"
                  value={`${requestsReport.kpis.acceptance_rate}%`}
                  sub="Submissions accepted by QA"
                  color="emerald"
                  icon={<CheckCircle2 size={16} />}
                />
                <ReportStatCard
                  label="Avg resubmissions"
                  value={requestsReport.kpis.avg_resubmissions}
                  sub="Attempts per recipient"
                  color={
                    requestsReport.kpis.avg_resubmissions > 1.5
                      ? "rose"
                      : "default"
                  }
                  icon={<ArrowLeftRight size={16} />}
                />
                <ReportStatCard
                  label="Overdue"
                  value={requestsReport.kpis.overdue}
                  sub="Open requests past due date"
                  color={requestsReport.kpis.overdue > 0 ? "amber" : "default"}
                  icon={<AlertCircle size={16} />}
                />
              </div>

              {/* Status distribution — all 4 variants */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {(
                  [
                    "donut",
                    "stacked-bar",
                    "stat-cards",
                    "vertical-bar",
                  ] as PhaseDistributionVariant[]
                ).map((v) => (
                  <ReportChartCard
                    key={v}
                    title={`Request status — ${v}`}
                    subtitle="Open · Closed · Cancelled"
                  >
                    <PhaseDistributionChart
                      data={requestsReport.status_distribution}
                      variant={v}
                      colorMap={REQUEST_STATUS_COLORS}
                      height={220}
                    />
                  </ReportChartCard>
                ))}
              </div>

              {/* Funnel + Mode split */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <ReportChartCard
                  title="Recipient submission funnel"
                  subtitle="Sent → Submitted → Accepted · shows drop-off at each step"
                  className="lg:col-span-2"
                >
                  <RequestFunnelChart data={requestsReport.funnel} />
                </ReportChartCard>

                <ReportChartCard
                  title="Request mode"
                  subtitle="Multi-office vs multi-document"
                >
                  <div className="flex flex-col gap-5 pt-1">
                    {[
                      {
                        label: "Multi-office",
                        value: requestsReport.mode_split.multi_office,
                        color: "#38bdf8",
                        icon: <Users size={14} />,
                      },
                      {
                        label: "Multi-document",
                        value: requestsReport.mode_split.multi_doc,
                        color: "#a855f7",
                        icon: <Layers size={14} />,
                      },
                    ].map((item) => {
                      const p = pct(item.value, requestModeTotal);
                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                              <span style={{ color: item.color }}>
                                {item.icon}
                              </span>
                              {item.label}
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                {item.value}
                              </span>
                              <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">
                                ({p}%)
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-surface-400 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${p}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ReportChartCard>
              </div>

              {/* Submission attempts + Volume trend */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ReportChartCard
                  title="Submission attempts"
                  subtitle="1st pass = accepted first try · 2nd+ = rejected and resubmitted"
                >
                  <SubmissionAttemptsChart
                    data={requestsReport.attempt_distribution}
                    height={200}
                  />
                </ReportChartCard>

                <ReportChartCard
                  title={`Request volume (${bucket})`}
                  subtitle="Requests created vs closed per period"
                >
                  <VolumeTrendChart data={requestsReport.volume_series} height={200} />
                </ReportChartCard>
              </div>

              {/* Office acceptance rate table */}
              <ReportChartCard
                title="Acceptance rate by office"
                subtitle="Sorted lowest first — these offices need the most follow-up"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-surface-400">
                        {[
                          "Office",
                          "Sent",
                          "Accepted",
                          "Rejected",
                          "Acceptance rate",
                        ].map((h) => (
                          <th
                            key={h}
                            className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...requestsReport.office_acceptance]
                        .sort((a, b) => a.rate - b.rate)
                        .map((row) => (
                          <tr
                            key={row.office}
                            className="border-b border-slate-100 dark:border-surface-400 last:border-0"
                          >
                            <td className="py-3 pr-6 font-semibold text-slate-900 dark:text-slate-100">
                              {row.office}
                            </td>
                            <td className="py-3 pr-6 tabular-nums text-slate-600 dark:text-slate-400">
                              {row.sent}
                            </td>
                            <td className="py-3 pr-6 tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                              {row.accepted}
                            </td>
                            <td className="py-3 pr-6 tabular-nums font-medium text-rose-600 dark:text-rose-400">
                              {row.rejected}
                            </td>
                            <td className="py-3 pr-6">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-surface-400 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${row.rate}%` }}
                                  />
                                </div>
                                <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">
                                  {row.rate}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </ReportChartCard>
            </>
          )}

          </div>
        </div>

        {/* Collapsible filter panel */}
        {filtersOpen && (
          <aside className="w-64 shrink-0 border-l border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-surface-400">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Filters</span>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Scope</label>
                <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className={filterSelectCls}>
                  <option value="clusters">Clusters</option>
                  <option value="offices">Offices</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Cluster</label>
                <select value={parent} onChange={(e) => setParent(e.target.value as Parent)} className={filterSelectCls}>
                  <option value="ALL">All clusters</option>
                  <option value="PO">President (PO)</option>
                  <option value="VAd">VP-Admin (VAd)</option>
                  <option value="VA">VP-AA (VA)</option>
                  <option value="VF">VP-Finance (VF)</option>
                  <option value="VR">VP-REQA (VR)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Time bucket</label>
                <select value={bucket} onChange={(e) => setBucket(e.target.value as Bucket)} className={filterSelectCls}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="total">Total</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date field</label>
                <select value={dateField} onChange={(e) => setDateField(e.target.value as DateField)} className={filterSelectCls}>
                  <option value="completed">By completed date</option>
                  <option value="created">By created date</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date from</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={filterSelectCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date to</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={filterSelectCls} />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="rounded-md border border-slate-200 dark:border-surface-400 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-500 transition"
                >
                  Clear dates
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </PageFrame>
  );
};

export default ReportsPage;
