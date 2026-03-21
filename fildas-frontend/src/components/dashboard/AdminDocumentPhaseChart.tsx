import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

type Props = {
  byPhase?: Record<string, number>;
  height?: number;
};

const PHASES = [
  { key: "draft",        label: "Draft",        color: "#94a3b8" },
  { key: "review",       label: "Review",        color: "#f59e0b" },
  { key: "approval",     label: "Approval",      color: "#6366f1" },
  { key: "finalization", label: "Finalization",  color: "#8b5cf6" },
  { key: "distributed",  label: "Distributed",   color: "#10b981" },
];

const AdminDocumentPhaseChart: React.FC<Props> = ({ byPhase, height = 180 }) => {
  const data = PHASES.map((p) => ({
    label: p.label,
    count: byPhase?.[p.key] ?? 0,
    color: p.color,
  }));

  const allZero = data.every((d) => d.count === 0);

  if (allZero) {
    return (
      <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
        No documents yet
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={82}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AdminDocumentPhaseChart;
