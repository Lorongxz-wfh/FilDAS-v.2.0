import React from "react";
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
  assigned: number; // QA routed to this cluster
  approved: number; // progressed past this cluster (approved/forwarded)
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
        <Bar dataKey="assigned" fill="#0ea5e9" name="Assigned" />
        <Bar dataKey="approved" fill="#10b981" name="Approved" />
        <Bar dataKey="returned" fill="#f43f5e" name="Returned" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
}
