import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const ReportChartCard: React.FC<Props> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}) => (
  <div
    className={`rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 overflow-hidden ${className}`}
  >
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-surface-400 px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

export default ReportChartCard;
