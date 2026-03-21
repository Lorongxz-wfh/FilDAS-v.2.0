import React from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

type Props = { active: number; inactive: number };

const COLORS = ["#10b981", "#94a3b8"];

const AdminUsersByRoleChart: React.FC<Props> = ({ active, inactive }) => {
  const total = active + inactive;

  if (total === 0) {
    return (
      <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
        No user data
      </p>
    );
  }

  const data = [
    { name: "Active", value: active },
    { name: "Inactive", value: inactive },
  ];

  const pct = Math.round((active / total) * 100);

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="relative shrink-0">
        <PieChart width={100} height={100}>
          <Pie
            data={data}
            cx={50}
            cy={50}
            innerRadius={32}
            outerRadius={46}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [v ?? 0, ""]}
          />
        </PieChart>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none text-slate-900 dark:text-slate-100">
            {total}
          </span>
          <span className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
          <div>
            <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {active}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active · {pct}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
          <div>
            <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {inactive}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Inactive</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersByRoleChart;
