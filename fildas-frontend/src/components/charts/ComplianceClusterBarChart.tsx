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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="cluster" />
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
  );
}
