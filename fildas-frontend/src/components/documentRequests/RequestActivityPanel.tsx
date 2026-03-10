import React from "react";
import { Activity } from "lucide-react";
import { formatDateTime } from "./shared";

type Props = {
  logs: any[];
  loading: boolean;
};

export default function RequestActivityPanel({ logs, loading }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/30 dark:bg-surface-600/30">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Activity size={28} className="text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No activity recorded yet.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log: any) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-white/60 dark:hover:bg-surface-500/40 transition"
            >
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {log.label}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {formatDateTime(log.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
