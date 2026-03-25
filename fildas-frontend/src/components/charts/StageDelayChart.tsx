import React from "react";
import { BarChart2 } from "lucide-react";

const EmptyChart = ({ height = 200 }: { height?: number }) => (
  <div
    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 dark:border-surface-300 bg-slate-50/50 dark:bg-surface-600/30 text-slate-400 dark:text-slate-500"
    style={{ height }}
  >
    <BarChart2 className="h-5 w-5 opacity-40" />
    <span className="text-xs font-medium">No data available</span>
  </div>
);
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

export type StageDelay = {
  stage: string;
  avg_hours: number;
  count: number;
  task_count: number;
};

const COLORS: Record<string, string> = {
  Office: "#6366f1",
  VP: "#f59e0b",
  QA: "#10b981",
  Registration: "#0ea5e9",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-surface-300 bg-white dark:bg-surface-500 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">{label}</p>
      <p className="text-slate-500 dark:text-slate-400">
        Avg hold:{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {payload[0].value}h
        </span>
      </p>
      {payload[0].payload?.count != null && (
        <p className="text-slate-500 dark:text-slate-400">
          Versions:{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {payload[0].payload.count}
          </span>
        </p>
      )}
    </div>
  );
};

const StageDelayChart: React.FC<{ data: StageDelay[]; height?: number }> = ({
  data,
  height = 200,
}) => {
  if (!data?.length) return <EmptyChart height={height} />;
  return (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 4, right: 40, left: 20, bottom: 0 }}
    >
      <XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
      <YAxis
        type="category"
        dataKey="stage"
        tick={{ fontSize: 11 }}
        width={80}
      />
      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
      <Bar dataKey="avg_hours" radius={[0, 4, 4, 0]}>
        <LabelList
          dataKey="avg_hours"
          position="right"
          formatter={(v: unknown) => {
            const n = v as number;
            return n > 0 ? `${n.toFixed(1)}h` : "—";
          }}
          style={{ fontSize: 11 }}
        />
        {data.map((entry) => (
          <Cell key={entry.stage} fill={COLORS[entry.stage] ?? "#94a3b8"} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
  );
};

export default StageDelayChart;
