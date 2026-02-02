import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import ComplianceClusterBarChart, {
  type ComplianceClusterDatum,
} from "../components/charts/ComplianceClusterBarChart";
import api from "../services/api";

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const me = getAuthUser();

  const [clusterData, setClusterData] = React.useState<
    ComplianceClusterDatum[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!me) return;

        setLoading(true);
        setLoadError(null);

        const res = await api.get("/reports/compliance");

        const clusters = (res.data?.clusters ?? []) as ComplianceClusterDatum[];

        if (!alive) return;
        setClusterData(clusters);
      } catch (err: any) {
        if (!alive) return;
        setLoadError(err?.response?.data?.message || "Failed to load report");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [me]);

  if (!me) return <Navigate to="/login" replace />;

  const totals = clusterData.reduce(
    (acc, x) => {
      acc.assigned += x.assigned;
      acc.approved += x.approved;
      acc.returned += x.returned;
      return acc;
    },
    { assigned: 0, approved: 0, returned: 0 },
  );

  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  // Simple "who is lagging" view: lowest approval rate first
  const ranked = clusterData
    .slice()
    .map((x) => ({
      ...x,
      approvalRate: pct(x.approved, x.assigned),
      returnRate: pct(x.returned, x.assigned),
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

      {loading && <Alert variant="info">Loading compliance report…</Alert>}

      {loadError && <Alert variant="danger">{loadError}</Alert>}

      <div className="grid grid-cols-1 gap-4">
        {/* KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-5">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total assigned (QA → VP/Pres)
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900 tabular-nums">
              {totals.assigned}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-5">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Approved / forwarded
            </div>
            <div className="mt-1 text-3xl font-semibold text-emerald-700 tabular-nums">
              {totals.approved}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Approval rate: {pct(totals.approved, totals.assigned)}%
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
              Return rate: {pct(totals.returned, totals.assigned)}%
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Compliance by cluster (VP + President)
              </div>
              <div className="text-xs text-slate-600">
                Assigned = QA routed to that cluster; Approved = progressed
                forward; Returned = sent back for edits.
              </div>
            </div>
          </div>

          <div className="mt-4 h-[340px] w-full">
            <ComplianceClusterBarChart data={clusterData} height={340} />
          </div>
        </div>

        {/* Ranking table */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
          <div className="text-sm font-semibold text-slate-900">
            Lowest compliance (quick view)
          </div>
          <div className="text-xs text-slate-600">
            Sorted by approval rate (lowest first). Placeholder data for now.
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2 pr-4">Cluster</th>
                  <th className="py-2 pr-4">Assigned</th>
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
                    <td className="py-2 pr-4 tabular-nums">{x.assigned}</td>
                    <td className="py-2 pr-4 tabular-nums">{x.approved}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {x.approvalRate}%
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{x.returned}</td>
                    <td className="py-2 pr-4 tabular-nums">{x.returnRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Definitions */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
          <div className="text-sm font-semibold text-slate-900">
            Definitions
          </div>
          <div className="mt-2 text-sm text-slate-700 space-y-1">
            <div>
              Assigned: count of workflow items QA forwarded to that cluster
              (review + approval steps).
            </div>
            <div>
              Approved/Forwarded: count that progressed to the next step after
              that cluster.
            </div>
            <div>
              Returned: count of return actions back to QA edit / Office edit
              from that cluster.
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
};

export default ReportsPage;
