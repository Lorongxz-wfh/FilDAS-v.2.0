import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import ComplianceClusterBarChart, {
  type ComplianceClusterDatum,
} from "../components/charts/ComplianceClusterBarChart";

import {
  getComplianceReport,
  type ComplianceSeriesDatum,
  type ComplianceOfficeDatum,
  type ComplianceVolumeSeriesDatum,
  type ComplianceKpis,
} from "../services/documents";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const me = getAuthUser();
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [bucket, setBucket] = React.useState<
    "daily" | "weekly" | "monthly" | "yearly" | "total"
  >("monthly");
  const [parent, setParent] = React.useState<
    "ALL" | "PO" | "VAd" | "VA" | "VF" | "VR"
  >("ALL");

  const [dateField, setDateField] = React.useState<"completed" | "created">(
    "completed",
  );

  const [scope, setScope] = React.useState<"clusters" | "offices">("clusters");

  const [officeData, setOfficeData] = React.useState<ComplianceOfficeDatum[]>(
    [],
  );

  const [clusterData, setClusterData] = React.useState<
    ComplianceClusterDatum[]
  >([]);

  const [seriesData, setSeriesData] = React.useState<ComplianceSeriesDatum[]>(
    [],
  );

  const [volumeSeries, setVolumeSeries] = React.useState<
    ComplianceVolumeSeriesDatum[]
  >([]);

 const [kpis, setKpis] = React.useState<ComplianceKpis>({
   total_created: 0,
   total_approved_final: 0,
   first_pass_yield_pct: 0,
   pingpong_ratio: 0,
   cycle_time_avg_days: 0,
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

        const report = await getComplianceReport({
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          date_field: dateField,
          bucket,
          scope,
          parent,
        });

        const clusters = (report.clusters ?? []) as ComplianceClusterDatum[];

        if (!alive) return;

        setClusterData(clusters);
        setSeriesData(report.series ?? []);
        setOfficeData(report.offices ?? []);

        setVolumeSeries(report.volume_series ?? []);
        setKpis(
          report.kpis ?? {
            total_created: 0,
            total_approved_final: 0,
            first_pass_yield_pct: 0,
            pingpong_ratio: 0,
            cycle_time_avg_days: 0,
          },
        );
      } catch (err: any) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load report");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [me, dateFrom, dateTo, bucket, parent, dateField, scope]);

  if (!me) return <Navigate to="/login" replace />;

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

  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  // Simple "who is lagging" view: lowest approval rate first
  const ranked = clusterData
    .slice()
    .map((x) => ({
      ...x,
      approvalRate: pct(x.approved, x.in_review),
      returnRate: pct(x.returned, x.in_review),
    }))
    .sort((a, b) => a.approvalRate - b.approvalRate);

  const rankedOffices = officeData
    .slice()
    .map((x) => ({
      ...x,
      approvalRate: pct(x.approved, x.in_review),
      returnRate: pct(x.returned, x.in_review),
    }))
    .sort((a, b) => a.approvalRate - b.approvalRate);

  return (
    <PageFrame
      title="Reports"
      right={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
        >
          ← Back
        </Button>
      }
    >
      {/* <Alert variant="warning">
        Placeholder only. Later: office compliance, bottlenecks, turnaround
        time, and per-role summaries.
      </Alert> */}

      {loading && <Alert variant="info">Loading approval report…</Alert>}

      {loadError && <Alert variant="danger">{loadError}</Alert>}

    <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Scope
          </div>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="clusters">Clusters</option>
            <option value="offices">Offices</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Parent
          </div>
          <select
            value={parent}
            onChange={(e) => setParent(e.target.value as any)}
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="PO">President (PO)</option>
            <option value="VAd">VP-Admin (VAd)</option>
            <option value="VA">VP-AA (VA)</option>
            <option value="VF">VP-Finance (VF)</option>
            <option value="VR">VP-REQA (VR)</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Bucket
          </div>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as any)}
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="total">Total</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Date field
          </div>
          <select
            value={dateField}
            onChange={(e) => setDateField(e.target.value as any)}
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="completed">Completed</option>
            <option value="created">Created</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            From
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            To
          </div>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-5">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Entered review (Office/VP)
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900 tabular-nums">
              {totals.in_review}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-5">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Final approved (distributed)
            </div>
            <div className="mt-1 text-3xl font-semibold text-emerald-700 tabular-nums">
              {totals.approved}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Final-approval rate: {pct(totals.approved, totals.in_review)}%
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-5">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Returned for edits
            </div>
            <div className="mt-1 text-3xl font-semibold text-rose-700 tabular-nums">
              {totals.returned}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Return rate: {pct(totals.returned, totals.in_review)}%
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-5">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              First-pass yield
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900 tabular-nums">
              {kpis.first_pass_yield_pct}%
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Of final approved versions with 0 returns.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-5">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Ping-pong ratio
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900 tabular-nums">
              {kpis.pingpong_ratio}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Returns per version (avg).
            </div>
          </div>
        </div>

        {/* Cluster chart (clusters scope only) */}
        {scope === "clusters" && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Approval performance by cluster (VP + President)
                </div>
                <div className="text-xs text-slate-600">
                  Routed = QA sent to that cluster; Final approved =
                  distributed; Returned = sent back for edits.
                </div>
              </div>
            </div>

            <div className="mt-4 h-85 w-full">
              <ComplianceClusterBarChart data={clusterData} height={340} />
            </div>
          </div>
        )}

        {/* Volume chart (always shown) */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Documents created vs final approved ({bucket})
              </div>
              <div className="text-xs text-slate-600">
                Created uses version created_at; Final approved uses
                distributed_at.
              </div>
            </div>
          </div>

          <div className="mt-4 h-80 w-full">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={volumeSeries}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" fill="#6366f1" name="Created" />
                <Bar
                  dataKey="approved_final"
                  fill="#10b981"
                  name="Final approved"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline (always shown) */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Approval timeline ({bucket})
              </div>
              <div className="text-xs text-slate-600">
                Based on task {dateField} date. Bucket label is
                day/week-start/month/year.
              </div>
            </div>
          </div>

          <div className="mt-4 h-80 w-full">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={seriesData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="in_review" fill="#0ea5e9" name="In review" />
                <Bar dataKey="sent_to_qa" fill="#a855f7" name="Sent to QA" />
                <Bar dataKey="approved" fill="#10b981" name="Final approved" />
                <Bar dataKey="returned" fill="#f43f5e" name="Returned" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Office table (offices scope only) */}
        {scope === "offices" && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
            <div className="text-sm font-semibold text-slate-900">
              Office compliance (approval rate lowest first)
            </div>
            <div className="text-xs text-slate-600">
              Grouped by assigned office. Filtered by Parent cluster.
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2 pr-4">Office</th>
                    <th className="py-2 pr-4">Cluster</th>
                    <th className="py-2 pr-4">In review</th>
                    <th className="py-2 pr-4">Approved</th>
                    <th className="py-2 pr-4">Approval %</th>
                    <th className="py-2 pr-4">Returned</th>
                    <th className="py-2 pr-4">Return %</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedOffices.map((x) => (
                    <tr key={x.office_id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {x.office_code ?? `Office #${x.office_id}`}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {x.cluster ?? "-"}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{x.in_review}</td>
                      <td className="py-2 pr-4 tabular-nums">{x.approved}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {x.approvalRate}%
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{x.returned}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {x.returnRate}%
                      </td>
                    </tr>
                  ))}
                  {!rankedOffices.length && (
                    <tr>
                      <td className="py-3 text-slate-500" colSpan={7}>
                        No office activity found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cluster ranking table (clusters scope only) */}
        {scope === "clusters" && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
            <div className="text-sm font-semibold text-slate-900">
              Lowest throughput (quick view)
            </div>
            <div className="text-xs text-slate-600">
              Sorted by approval rate (lowest first). Placeholder data for now.
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2 pr-4">Cluster</th>
                    <th className="py-2 pr-4">In review</th>
                    <th className="py-2 pr-4">Approved</th>
                    <th className="py-2 pr-4">Approval %</th>
                    <th className="py-2 pr-4">Returned</th>
                    <th className="py-2 pr-4">Return %</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((x) => (
                    <tr key={x.cluster} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {x.cluster}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{x.in_review}</td>
                      <td className="py-2 pr-4 tabular-nums">{x.approved}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {x.approvalRate}%
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{x.returned}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {x.returnRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Definitions */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
          <div className="text-sm font-semibold text-slate-900">
            Definitions
          </div>
          <div className="mt-2 text-sm text-slate-700 space-y-1">
            <div>
              In review: versions that reached office head or VP review.
            </div>
            <div>Sent to QA: versions that reached QA approval step.</div>
            <div>Final approved: versions that were distributed.</div>
            <div>Returned: versions that were sent back for edits.</div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
};

export default ReportsPage;
