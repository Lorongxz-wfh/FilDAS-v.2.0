import React from "react";
import { useNavigate } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import { getComplianceReport } from "../services/documents";
import { useAuthUser } from "../hooks/useAuthUser";
import {
  exportKpiCsv,
  exportKpiPdf,
  exportVolumeCsv,
  exportVolumePdf,
  exportClusterCsv,
  exportClusterPdf,
  exportOfficeCsv,
  exportOfficePdf,
  exportStageDelayCsv,
  exportStageDelayPdf,
  exportTimelineCsv,
  exportTimelinePdf,
} from "../services/reportExport";
import type {
  ComplianceKpis,
  ComplianceVolumeSeriesDatum,
  ComplianceSeriesDatum,
  ComplianceOfficeDatum,
  ComplianceStageDelayDatum,
} from "../services/documents";
import type { ComplianceClusterDatum } from "../components/charts/ComplianceClusterBarChart";

// ── Types ──────────────────────────────────────────────────────────────────────

type Format = "pdf" | "csv";

type ExportSection = {
  key: string;
  label: string;
  description: string;
  previewHeaders: string[];
  previewRows: () => (string | number)[][];
  exportFn: (fmt: Format) => void;
};

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

// ── Main Page ──────────────────────────────────────────────────────────────────

const ReportExportPage: React.FC = () => {
  const navigate = useNavigate();
  const me = useAuthUser();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [kpis, setKpis] = React.useState<ComplianceKpis>({
    total_created: 0,
    total_approved_final: 0,
    first_pass_yield_pct: 0,
    pingpong_ratio: 0,
    cycle_time_avg_days: 0,
  });
  const [clusterData, setClusterData] = React.useState<
    ComplianceClusterDatum[]
  >([]);
  const [officeData, setOfficeData] = React.useState<ComplianceOfficeDatum[]>(
    [],
  );
  const [volumeSeries, setVolumeSeries] = React.useState<
    ComplianceVolumeSeriesDatum[]
  >([]);
  const [seriesData, setSeriesData] = React.useState<ComplianceSeriesDatum[]>(
    [],
  );
  const [stageDelays, setStageDelays] = React.useState<
    ComplianceStageDelayDatum[]
  >([]);

  const [selected, setSelected] = React.useState<Record<string, boolean>>({
    kpi: true,
    volume: true,
    cluster: true,
    office: false,
    stage: true,
    timeline: true,
  });
  const [formats, setFormats] = React.useState<Record<string, Format>>({
    kpi: "pdf",
    volume: "csv",
    cluster: "pdf",
    office: "csv",
    stage: "pdf",
    timeline: "csv",
  });
  const [exporting, setExporting] = React.useState(false);

  const totals = clusterData.reduce(
    (acc, x) => {
      acc.in_review += x.in_review;
      acc.approved += x.approved;
      acc.returned += x.returned;
      return acc;
    },
    { in_review: 0, approved: 0, returned: 0 },
  );

  React.useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        setLoading(true);
        const report = await getComplianceReport({});
        setKpis(report.kpis);
        setClusterData(report.clusters as ComplianceClusterDatum[]);
        setOfficeData(report.offices);
        setVolumeSeries(report.volume_series);
        setSeriesData(report.series);
        setStageDelays(report.stage_delays);
      } catch (e: any) {
        setError(e?.message || "Failed to load report data");
      } finally {
        setLoading(false);
      }
    })();
  }, [me]);

  const sections: ExportSection[] = [
    {
      key: "kpi",
      label: "KPI Summary",
      description:
        "Key metrics: cycle time, first-pass yield, ping-pong ratio, approval rates.",
      previewHeaders: ["Metric", "Value"],
      previewRows: () => [
        ["Total created", kpis.total_created],
        ["Total distributed", kpis.total_approved_final],
        [
          "Completion rate",
          `${pct(kpis.total_approved_final, kpis.total_created)}%`,
        ],
        ["First-pass yield", `${kpis.first_pass_yield_pct}%`],
        ["Ping-pong ratio", kpis.pingpong_ratio],
        ["Avg cycle time", `${kpis.cycle_time_avg_days} days`],
      ],
      exportFn: (fmt) =>
        fmt === "pdf" ? exportKpiPdf(kpis, totals) : exportKpiCsv(kpis, totals),
    },
    {
      key: "volume",
      label: "Volume Trend",
      description: "Documents created vs distributed per period.",
      previewHeaders: ["Period", "Created", "Distributed"],
      previewRows: () =>
        volumeSeries
          .slice(0, 6)
          .map((r) => [r.label, r.created, r.approved_final]),
      exportFn: (fmt) =>
        fmt === "pdf"
          ? exportVolumePdf(volumeSeries)
          : exportVolumeCsv(volumeSeries),
    },
    {
      key: "cluster",
      label: "Cluster Compliance",
      description: "Approval and return rates broken down by VP cluster.",
      previewHeaders: [
        "Cluster",
        "In Review",
        "Approved",
        "Approval %",
        "Returned",
      ],
      previewRows: () =>
        clusterData
          .slice(0, 6)
          .map((r) => [
            r.cluster,
            r.in_review,
            r.approved,
            `${pct(r.approved, r.in_review)}%`,
            r.returned,
          ]),
      exportFn: (fmt) =>
        fmt === "pdf"
          ? exportClusterPdf(clusterData)
          : exportClusterCsv(clusterData),
    },
    {
      key: "office",
      label: "Office Compliance",
      description:
        "Per-office breakdown of review, approval, and return counts.",
      previewHeaders: [
        "Office",
        "Cluster",
        "Approved",
        "Approval %",
        "Returned",
      ],
      previewRows: () =>
        officeData
          .slice(0, 6)
          .map((r) => [
            r.office_code ?? `#${r.office_id}`,
            r.cluster ?? "—",
            r.approved,
            `${pct(r.approved, r.in_review)}%`,
            r.returned,
          ]),
      exportFn: (fmt) =>
        fmt === "pdf"
          ? exportOfficePdf(officeData)
          : exportOfficeCsv(officeData),
    },
    {
      key: "stage",
      label: "Stage Delay",
      description:
        "Average hours spent per workflow stage (Office, VP, QA, Registration).",
      previewHeaders: ["Stage", "Avg Hours", "Versions", "Tasks"],
      previewRows: () =>
        stageDelays.map((r) => [r.stage, r.avg_hours, r.count, r.task_count]),
      exportFn: (fmt) =>
        fmt === "pdf"
          ? exportStageDelayPdf(stageDelays)
          : exportStageDelayCsv(stageDelays),
    },
    {
      key: "timeline",
      label: "Approval Timeline",
      description:
        "In-review, sent-to-QA, distributed, and returned counts per time period.",
      previewHeaders: [
        "Period",
        "In Review",
        "Sent to QA",
        "Distributed",
        "Returned",
      ],
      previewRows: () =>
        seriesData
          .slice(0, 6)
          .map((r) => [
            r.label,
            r.in_review,
            r.sent_to_qa,
            r.approved,
            r.returned,
          ]),
      exportFn: (fmt) =>
        fmt === "pdf"
          ? exportTimelinePdf(seriesData)
          : exportTimelineCsv(seriesData),
    },
  ];

  const handleExportAll = async () => {
    setExporting(true);
    for (const s of sections) {
      if (!selected[s.key]) continue;
      await new Promise((res) => setTimeout(res, 120)); // slight delay between downloads
      s.exportFn(formats[s.key]);
    }
    setExporting(false);
  };

  const toggleSelect = (key: string) =>
    setSelected((p) => ({ ...p, [key]: !p[key] }));

  const setFormat = (key: string, fmt: Format) =>
    setFormats((p) => ({ ...p, [key]: fmt }));

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <PageFrame
      title="Export Reports"
      onBack={() => navigate("/reports")}
      breadcrumbs={[{ label: "Reports", to: "/reports" }]}
      contentClassName="flex flex-col gap-5"
      right={
        <button
          type="button"
          disabled={selectedCount === 0 || exporting || loading}
          onClick={handleExportAll}
          className="inline-flex items-center gap-2 rounded-md bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition"
        >
          {exporting ? "Exporting…" : `↓ Export ${selectedCount} selected`}
        </button>
      }
    >
      {/* Select all / none */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() =>
            setSelected(Object.fromEntries(sections.map((s) => [s.key, true])))
          }
          className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
        >
          Select all
        </button>
        <span className="text-slate-300 dark:text-surface-400">|</span>
        <button
          type="button"
          onClick={() =>
            setSelected(Object.fromEntries(sections.map((s) => [s.key, false])))
          }
          className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
        >
          Select none
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {selectedCount} of {sections.length} selected
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400 dark:text-slate-500">
          Loading report data…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sections.map((s) => {
            const isSelected = !!selected[s.key];
            const fmt = formats[s.key];
            const rows = s.previewRows();

            return (
              <div
                key={s.key}
                className={`rounded-xl border bg-white dark:bg-surface-500 overflow-hidden transition ${
                  isSelected
                    ? "border-sky-400 dark:border-sky-600 ring-1 ring-sky-400/30"
                    : "border-slate-200 dark:border-surface-400"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-surface-400">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(s.key)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-sky-500 cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {s.description}
                      </p>
                    </div>
                  </div>

                  {/* Format toggle */}
                  <div className="flex shrink-0 rounded-md border border-slate-200 dark:border-surface-400 overflow-hidden text-xs font-medium">
                    {(["pdf", "csv"] as Format[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(s.key, f)}
                        className={`px-3 py-1.5 transition ${
                          fmt === f
                            ? "bg-sky-500 text-white"
                            : "bg-white dark:bg-surface-500 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-400"
                        }`}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview table */}
                <div className="px-5 py-4 overflow-x-auto">
                  {rows.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
                      No data available.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-surface-400">
                          {s.previewHeaders.map((h) => (
                            <th
                              key={h}
                              className="pb-2 pr-4 text-left font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-slate-100 dark:border-surface-400 last:border-0"
                          >
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className="py-2 pr-4 text-slate-700 dark:text-slate-300 tabular-nums"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      {rows.length >= 6 && (
                        <tfoot>
                          <tr>
                            <td
                              colSpan={s.previewHeaders.length}
                              className="pt-2 text-[10px] text-slate-400 dark:text-slate-500"
                            >
                              Showing first 6 rows — full data exported
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageFrame>
  );
};

export default ReportExportPage;
