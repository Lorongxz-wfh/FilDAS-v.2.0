import React from "react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../ui/Badge";
import SkeletonList from "../ui/loader/SkeletonList";
import type { PendingAction } from "../../services/types";
import { FileText, CheckCircle, Megaphone } from "lucide-react";

type Props = {
  items: PendingAction[];
  loading: boolean;
};

const DashboardPendingList: React.FC<Props> = ({ items, loading }) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-md border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-400 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Pending actions
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Items requiring your attention right now.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/work-queue")}
          className="shrink-0 text-xs font-medium text-brand-500 hover:text-brand-400 dark:text-brand-400 transition-colors"
        >
          View all →
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 dark:divide-surface-400">
        {loading ? (
          <div className="flex flex-col h-full bg-white dark:bg-surface-500">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-surface-400">
              <SkeletonList variant="text" count={1} />
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <SkeletonList variant="document" count={5} />
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
              <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              All caught up
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              No pending actions right now.
            </p>
          </div>
        ) : (
          items.slice(0, 5).map((x) => {
            const isRequest = x.type === "request";
            const Icon = isRequest ? Megaphone : FileText;

            const handleClick = () => {
              if (x.type === "document") {
                navigate(`/documents/${x.item.document.id}?version_id=${x.item.version.id}`);
              } else {
                navigate(`/document-requests/${x.id}`);
              }
            };

            return (
              <button
                key={`${x.type}-${x.id}`}
                type="button"
                onClick={handleClick}
                className="flex w-full items-center gap-2.5 sm:gap-3 p-3.5 sm:px-4 sm:py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-surface-400 min-w-0"
              >
                {/* Icon */}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${isRequest ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-slate-100 dark:bg-surface-400'}`}>
                  <Icon className={`h-3.5 w-3.5 ${isRequest ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                </div>

                {/* Title + code */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">
                    {x.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                    {x.code ?? "—"}
                  </p>
                </div>

                {/* Status badge */}
                <StatusBadge status={x.status} className="shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DashboardPendingList;
