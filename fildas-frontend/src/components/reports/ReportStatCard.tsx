import React from "react";

type Color = "default" | "emerald" | "rose" | "sky" | "violet" | "amber";

const colorMap: Record<Color, { value: string; bg: string; icon: string }> = {
  default: {
    value: "text-slate-900 dark:text-slate-100",
    bg: "bg-slate-100 dark:bg-surface-400",
    icon: "text-slate-500 dark:text-slate-400",
  },
  emerald: {
    value: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: "text-emerald-500",
  },
  rose: {
    value: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    icon: "text-rose-500",
  },
  sky: {
    value: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    icon: "text-sky-500",
  },
  violet: {
    value: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    icon: "text-violet-500",
  },
  amber: {
    value: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: "text-amber-500",
  },
};

type Props = {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: Color;
  icon?: React.ReactNode;
};

const ReportStatCard: React.FC<Props> = ({
  label,
  value,
  sub,
  color = "default",
  icon,
}) => {
  const c = colorMap[color];
  return (
    <div className="flex-1 min-w-40 rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 px-5 py-4 flex items-start gap-4">
      {icon && (
        <div className={`mt-0.5 rounded-lg p-2 ${c.bg}`}>
          <span className={`text-lg ${c.icon}`}>{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <div
          className={`text-2xl font-bold tabular-nums leading-none ${c.value}`}
        >
          {value}
        </div>
        <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </div>
        {sub && (
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportStatCard;
