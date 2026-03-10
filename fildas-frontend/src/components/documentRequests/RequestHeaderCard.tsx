import React from "react";
import { Clock, FileText } from "lucide-react";
import { StatusBadge, formatDate } from "./shared";

type Props = {
  requestId: number;
  req: any;
  recipient: any;
};

export default function RequestHeaderCard({
  requestId,
  req,
  recipient,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500 overflow-hidden">
      {/* Title row */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-surface-400">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
          #{requestId}
        </span>
        <h1 className="flex-1 text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
          {req.title}
        </h1>
        <StatusBadge status={req.status} />
        {req.example_original_filename && (
          <div className="flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] text-slate-500 dark:border-surface-400 dark:bg-surface-600 dark:text-slate-400 shrink-0">
            <FileText size={11} />
            <span className="truncate max-w-32">
              {req.example_original_filename}
            </span>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-6 px-5 py-2.5 bg-slate-50/50 dark:bg-surface-600/40 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Due:
          </span>
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {formatDate(req.due_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Office:
          </span>
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {req.office_name ?? "—"}
            {req.office_code && (
              <span className="ml-1 text-slate-400">({req.office_code})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Submission:
          </span>
          {recipient?.status ? (
            <StatusBadge status={recipient.status} />
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {req.description && (
        <div className="px-5 py-3 border-t border-blue-100 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-1">
            Instructions
          </p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-h-20 overflow-y-auto">
            {req.description}
          </p>
        </div>
      )}
    </div>
  );
}
