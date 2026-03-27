import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

type Props = { data: { label: string; count: number }[]; height?: number; loading?: boolean };

const ChartSkeleton = ({ height = 180 }: { height?: number }) => (
  <div style={{ height }} className="flex items-end gap-2 px-2 pb-5 pt-2">
    {[40, 65, 50, 80, 55, 70, 45, 90].map((h, i) => (
      <div key={i} className="flex-1 animate-pulse rounded-t-sm bg-slate-100 dark:bg-surface-400" style={{ height: `${h}%` }} />
    ))}
  </div>
);

const AdminActivityBarChart: React.FC<Props> = ({ data, height = 180, loading = false }) => {
  if (loading) return <ChartSkeleton height={height} />;
  return (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
        {data.map((_, i) => (
          <Cell key={i} fill={i === data.length - 1 ? "#6366f1" : "#c7d2fe"} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
  );
};

export default AdminActivityBarChart;
