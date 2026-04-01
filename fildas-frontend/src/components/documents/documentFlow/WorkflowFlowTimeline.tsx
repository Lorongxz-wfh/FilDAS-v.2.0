import React from "react";
import { 
  GitCommit, 
  Send, 
  CheckCircle2, 
  XCircle, 
  CornerDownRight,
  History,
  AlertCircle
} from "lucide-react";
import type { ActivityLogItem } from "../../../services/documents";
import { formatDateTime } from "../../../utils/formatters";

interface Props {
  logs: ActivityLogItem[];
  isLoading: boolean;
}

const WORKFLOW_EVENTS = [
  "document.created",
  "workflow.sent_to_review",
  "workflow.sent_to_approval",
  "workflow.forwarded_to_vp",
  "workflow.forwarded_to_president",
  "workflow.returned_for_check",
  "workflow.returned_to_draft",
  "workflow.rejected",
  "workflow.registered",
  "workflow.distributed",
  "workflow.cancelled",
  "version.revision_created",
];

const WorkflowFlowTimeline: React.FC<Props> = ({ logs, isLoading }) => {
  // Filter for workflow state transitions and sort by date ASC
  const flowLogs = logs
    .filter((l) => WORKFLOW_EVENTS.includes(l.event))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-surface-400 shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-slate-200 dark:bg-surface-400 rounded w-3/4" />
              <div className="h-2 bg-slate-100 dark:bg-surface-500 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (flowLogs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <div className="rounded-full bg-slate-50 dark:bg-surface-600/50 p-4 mb-3 border border-slate-100 dark:border-surface-400/30">
          <History className="h-8 w-8 text-slate-300 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          No workflow transitions recorded yet.
        </p>
      </div>
    );
  }

  const getEventIcon = (event: string) => {
    switch (event) {
      case "document.created":
      case "version.revision_created":
        return <GitCommit className="h-3.5 w-3.5" />;
      case "workflow.rejected":
      case "workflow.cancelled":
        return <XCircle className="h-3.5 w-3.5" />;
      case "workflow.distributed":
      case "workflow.registered":
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "workflow.returned_to_draft":
      case "workflow.returned_for_check":
        return <AlertCircle className="h-3.5 w-3.5" />;
      default:
        return <Send className="h-3.5 w-3.5" />;
    }
  };

  const getEventBg = (event: string) => {
    if (event === "workflow.rejected" || event === "workflow.cancelled") {
      return "bg-rose-50 text-rose-500 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800";
    }
    if (event === "workflow.distributed" || event === "workflow.registered") {
      return "bg-emerald-50 text-emerald-500 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800";
    }
    if (event.includes("returned")) {
      return "bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";
    }
    return "bg-slate-50 text-slate-500 border-slate-100 dark:bg-surface-400 dark:text-slate-300 dark:border-surface-300";
  };

  return (
    <div className="flex-1 overflow-visible px-1 py-1">
      <div className="relative pl-10 space-y-8 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-surface-400">
        {flowLogs.map((log, index) => {
          const isLast = index === flowLogs.length - 1;
          const fromStatus = log.meta?.from_status;
          const toStatus = log.meta?.to_status;
          const note = log.meta?.note;

          return (
            <div key={log.id} className="relative group">
              {/* Timeline Connector Dot */}
              <div className={`absolute -left-10 top-0.5 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white dark:bg-surface-600 z-10 transition-all ${getEventBg(log.event)} ${isLast ? 'ring-4 ring-brand-500/10 dark:ring-brand-500/20 scale-110 shadow-sm border-brand-200 dark:border-brand-500/40' : 'border-white dark:border-surface-400 shadow-sm'}`}>
                {getEventIcon(log.event)}
              </div>

              {/* Content Card */}
              <div className={`rounded-xl border p-3.5 transition-all ${isLast ? 'border-brand-200 bg-brand-50/20 dark:border-brand-500/20 dark:bg-brand-500/5 shadow-sm' : 'border-slate-100 bg-white dark:border-surface-400 dark:bg-surface-500 hover:border-slate-300 dark:hover:border-slate-400'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                      {log.label || (log.event === "document.created" ? "Document Created" : "Status Changed")}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </div>

                {/* Transition Flow */}
                {fromStatus && toStatus && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200/60 bg-slate-50/50 text-slate-500 dark:bg-surface-400/40 dark:text-slate-400 dark:border-surface-300/20">
                      {fromStatus}
                    </span>
                    <CornerDownRight className="h-3 w-3 text-slate-300 dark:text-surface-400" />
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                      log.event === 'workflow.rejected' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50 shadow-sm' : 
                      log.event.includes('distributed') || log.event.includes('registered') ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 shadow-sm' :
                      'bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/30'
                    }`}>
                      {toStatus}
                    </span>
                  </div>
                )}

                {/* Actor Info */}
                <div className="mt-3.5 flex items-center gap-2.5 border-t border-slate-100 dark:border-surface-400/50 pt-3">
                  <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-surface-400 flex items-center justify-center text-[11px] font-black text-slate-500 dark:text-slate-300 border border-white dark:border-surface-500 shadow-sm">
                    {(log.actor_user?.first_name?.[0] || log.actor_user?.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                      {log.actor_user?.full_name || log.actor_user?.name || "System"}
                    </p>
                    {log.actor_office && (
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate font-semibold uppercase">
                        {log.actor_office.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional Note */}
                {note && (
                  <div className="mt-3 rounded-lg bg-slate-50/80 dark:bg-surface-600/30 p-2.5 border border-slate-200/50 dark:border-surface-400/40">
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 italic">
                      "{note}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowFlowTimeline;
