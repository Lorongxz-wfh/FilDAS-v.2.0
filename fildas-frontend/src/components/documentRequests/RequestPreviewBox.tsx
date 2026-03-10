// import React from "react";
import { RefreshCw, Download, Maximize2 } from "lucide-react";

type Props = {
  url: string;
  loading: boolean;
  error: string | null;
  filename?: string | null;
  emptyLabel?: string;
  onViewModal?: () => void;
  onDownload?: () => void;
  onRefresh?: () => void;
};

export default function RequestPreviewBox({
  url,
  loading,
  error,
  filename,
  emptyLabel,
  onViewModal,
  onDownload,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 dark:border-surface-400">
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-surface-400 dark:bg-surface-600">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[55%]">
          {filename ?? "Preview"}
        </span>
        <div className="flex items-center gap-0.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition dark:hover:bg-surface-400 dark:hover:text-slate-200 disabled:opacity-40"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />{" "}
              Refresh
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition dark:hover:bg-surface-400 dark:hover:text-slate-200"
            >
              <Download size={11} /> Download
            </button>
          )}
          {onViewModal && url && (
            <button
              onClick={onViewModal}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition dark:hover:bg-surface-400 dark:hover:text-slate-200"
            >
              <Maximize2 size={11} /> View
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-white dark:bg-surface-600">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
            <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
            Loading preview…
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-500 dark:text-rose-400 px-4 text-center">
            {error}
          </div>
        ) : url ? (
          <iframe title="preview" src={url} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            {emptyLabel ?? "No preview available."}
          </div>
        )}
      </div>
    </div>
  );
}
