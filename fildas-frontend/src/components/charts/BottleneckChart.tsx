import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

export type BottleneckDatum = {
  office: string;
  avg_hours: number;
  task_count: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Red ≥ 72h · Amber ≥ 48h · Sky = normal */
const severityColor = (hours: number): string => {
  if (hours >= 72) return "#f43f5e";
  if (hours >= 48) return "#f59e0b";
  return "#38bdf8";
};

const severityLabel = (hours: number): string => {
  if (hours >= 72) return "Critical";
  if (hours >= 48) return "Slow";
  return "Normal";
};

// ── Tooltip ────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const hours: number = payload[0].value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-surface-300 dark:bg-surface-500 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
        {label}
      </p>
      <p className="text-slate-500 dark:text-slate-400">
        Avg hold:{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {hours}h
        </span>
      </p>
      <p className="text-slate-500 dark:text-slate-400">
        Active tasks:{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {payload[0].payload.task_count}
        </span>
      </p>
      <p className="mt-1" style={{ color: severityColor(hours) }}>
        {severityLabel(hours)}
      </p>
    </div>
  );
};

// ── Chart ──────────────────────────────────────────────────────────────────────

const BottleneckChart: React.FC<{
  data: BottleneckDatum[];
  height?: number;
}> = ({ data, height = 220 }) => {
  const sorted = [...data].sort((a, b) => b.avg_hours - a.avg_hours);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 56, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          unit="h"
        />
        <YAxis
          type="category"
          dataKey="office"
          tick={{ fontSize: 11 }}
          width={80}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(148,163,184,0.07)" }}
        />
        <Bar dataKey="avg_hours" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList
            dataKey="avg_hours"
            position="right"
            formatter={(v: unknown) => `${v}h`}
            style={{ fontSize: 11, fill: "currentColor" }}
          />
          {sorted.map((d) => (
            <Cell key={d.office} fill={severityColor(d.avg_hours)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BottleneckChart;
