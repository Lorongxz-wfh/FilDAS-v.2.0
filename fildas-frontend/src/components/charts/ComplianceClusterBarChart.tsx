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

export type ComplianceClusterDatum = {
  cluster: string; // e.g. "VAd", "VA", "VF", "VR", "PO"
  in_review: number; // reached office head OR VP review
  sent_to_qa: number; // reached QA approval step
  approved: number; // distributed
  returned: number; // returned-for-edit count
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-surface-300 bg-white dark:bg-surface-500 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.fill ?? p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
          <span className="ml-auto font-semibold text-slate-800 dark:text-slate-100 pl-3">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ComplianceClusterBarChart(props: {
  data: ComplianceClusterDatum[];
  height?: number;
}) {
  const height = props.height ?? 280;

  return (
    <div style={{ width: "100%", height: "100%", minHeight: height }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={props.data}
          margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
          <XAxis dataKey="cluster" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="in_review" fill="#0ea5e9" name="In review" radius={[3, 3, 0, 0] as any} />
          <Bar dataKey="sent_to_qa" fill="#a855f7" name="Sent to QA" radius={[3, 3, 0, 0] as any} />
          <Bar dataKey="approved" fill="#10b981" name="Final approved" radius={[3, 3, 0, 0] as any} />
          <Bar dataKey="returned" fill="#f43f5e" name="Returned" radius={[3, 3, 0, 0] as any} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
