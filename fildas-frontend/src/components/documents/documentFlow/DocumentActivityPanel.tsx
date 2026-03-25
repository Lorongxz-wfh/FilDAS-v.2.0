import React from "react";
import Skeleton from "../../ui/loader/Skeleton";
import type { ActivityLogItem } from "../../../services/documents";

const EVENT_DOT: Record<string, string> = {
  "workflow.rejected":         "bg-rose-500",
  "workflow.cancelled":        "bg-rose-400",
  "version.deleted":           "bg-rose-400",
  "version.cancelled":         "bg-rose-400",
  "workflow.distributed":      "bg-emerald-500",
  "workflow.registered":       "bg-emerald-400",
  "workflow.sent_to_review":   "bg-sky-400",
  "workflow.sent_to_approval": "bg-violet-400",
  "workflow.forwarded_to_vp":  "bg-violet-400",
  "workflow.forwarded_to_president": "bg-violet-500",
  "workflow.returned_for_check":     "bg-amber-400",
  "workflow.returned_to_draft":      "bg-amber-400",
  "document.created":          "bg-slate-400",
  "document.field_changed":    "bg-slate-400",
  "version.revision_created":  "bg-slate-400",
};

const EVENT_LABEL: Record<string, string> = {
  "workflow.rejected":         "Rejected — returned to draft",
  "workflow.cancelled":        "Document cancelled",
  "version.deleted":           "Draft deleted",
  "version.cancelled":         "Draft cancelled",
  "workflow.distributed":      "Document distributed",
  "workflow.registered":       "Document registered",
  "workflow.sent_to_review":   "Forwarded for review",
  "workflow.sent_to_approval": "Forwarded for approval",
  "workflow.forwarded_to_vp":  "Forwarded to VP",
  "workflow.forwarded_to_president": "Forwarded to President",
  "workflow.returned_for_check":     "Returned for check",
  "workflow.returned_to_draft":      "Returned to draft",
  "document.created":          "Document created",
  "document.field_changed":    "Details updated",
  "version.revision_created":  "Revision started",
  "version.file_uploaded":     "File uploaded",
  "version.file_replaced":     "File replaced",
  "document.tags_updated":     "Tags updated",
  "document.updated":          "Document updated",
  "version.updated":           "Version updated",
  "version.downloaded":        "File downloaded",
};

const FIELD_LABEL: Record<string, string> = {
  title:          "Title",
  description:    "Description",
  effective_date: "Effective date",
};

type FieldChange = { field: string; old: string | null; new: string | null };

function FieldChangeDiff({ changes }: { changes: FieldChange[] }) {
  return (
    <div className="mt-1.5 space-y-1.5">
      {changes.map((c, i) => (
        <div key={i} className="rounded border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-600 text-[11px] overflow-hidden">
          <div className="px-2 py-0.5 bg-slate-100 dark:bg-surface-500 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-surface-400">
            {FIELD_LABEL[c.field] ?? c.field}
          </div>
          <div className="flex divide-x divide-slate-200 dark:divide-surface-400">
            <div className="flex-1 px-2 py-1 text-slate-400 dark:text-slate-500 line-through min-w-0">
              <span className="block truncate">{c.old ?? <em className="not-italic opacity-50">empty</em>}</span>
            </div>
            <div className="flex-1 px-2 py-1 text-slate-700 dark:text-slate-300 min-w-0">
              <span className="block truncate">{c.new ?? <em className="not-italic opacity-50">empty</em>}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  isLoading: boolean;
  logs: ActivityLogItem[];
  formatWhen: (iso: string) => string;
  panelHeight?: number;
};

const DocumentActivityPanel: React.FC<Props> = ({
  isLoading,
  logs,
  formatWhen,
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 dark:border-surface-400 dark:bg-surface-600/60">
      {isLoading ? (
        <div className="space-y-2 p-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No activity yet.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-surface-400">
          {logs.map((l) => {
            const dotCls = EVENT_DOT[l.event] ?? "bg-sky-400";
            const displayLabel = l.label || EVENT_LABEL[l.event] || l.event;
            const changes: FieldChange[] | null =
              l.event === "document.field_changed" && Array.isArray(l.meta?.changes)
                ? (l.meta.changes as FieldChange[])
                : null;
            return (
              <div
                key={l.id}
                className="flex items-start gap-3 px-3 py-2.5 hover:bg-white/60 dark:hover:bg-surface-500/40 transition"
              >
                <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotCls}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {displayLabel}
                  </p>
                  {changes && changes.length > 0 && (
                    <FieldChangeDiff changes={changes} />
                  )}
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {l.created_at ? formatWhen(l.created_at) : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentActivityPanel;
