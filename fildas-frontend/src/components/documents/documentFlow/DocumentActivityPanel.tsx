import React from "react";
import Skeleton from "../../ui/loader/Skeleton";
import type { ActivityLogItem } from "../../../services/documents";

type Props = {
  isLoading: boolean;
  logs: ActivityLogItem[];
  formatWhen: (iso: string) => string;
};

const DocumentActivityPanel: React.FC<Props> = ({
  isLoading,
  logs,
  formatWhen,
}) => {
  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="h-44 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-surface-400 dark:bg-surface-600/60">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex h-44 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/60 dark:border-surface-400 dark:bg-surface-600/60">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No activity yet.
          </p>
        </div>
      ) : (
        <div className="h-44 overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-surface-400 dark:bg-surface-600/60">
          {logs.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm dark:border-surface-400 dark:bg-surface-500/80"
            >
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{l.event}</span>
                {l.label ? ` — ${l.label}` : ""}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {l.created_at ? formatWhen(l.created_at) : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentActivityPanel;
