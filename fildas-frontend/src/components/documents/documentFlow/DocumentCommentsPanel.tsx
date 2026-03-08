import React from "react";
import Skeleton from "../../ui/loader/Skeleton";
import type { DocumentMessage } from "../../../services/documents";

type Props = {
  isLoading: boolean;
  messages: DocumentMessage[];
  draftMessage: string;
  setDraftMessage: (v: string) => void;
  isSending: boolean;
  onSend: () => Promise<void>;
  formatWhen: (iso: string) => string;
};

const DocumentCommentsPanel: React.FC<Props> = ({
  isLoading,
  messages,
  draftMessage,
  setDraftMessage,
  isSending,
  onSend,
  formatWhen,
}) => {
  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="h-44 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-surface-400 dark:bg-surface-600/60">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-44 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/60 dark:border-surface-400 dark:bg-surface-600/60">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No comments yet.
          </p>
        </div>
      ) : (
        <div className="h-44 overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-surface-400 dark:bg-surface-600/60">
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-xl bg-white/80 border border-slate-200 px-3 py-2 shadow-sm dark:border-surface-400 dark:bg-surface-500/80"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {m.sender?.full_name ?? "Unknown"} —{" "}
                  {m.sender?.role?.name ?? "—"} — {formatWhen(m.created_at)}
                </p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-surface-400 dark:text-slate-300">
                  {m.type}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {m.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex gap-2">
        <textarea
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800 shadow-sm resize-none dark:border-surface-400 dark:bg-surface-400 dark:text-slate-200 dark:placeholder-slate-500"
          rows={2}
          value={draftMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
          placeholder="Write a comment…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (!isSending && draftMessage.trim()) onSend();
            }
          }}
        />
        <button
          type="button"
          disabled={isSending || draftMessage.trim().length === 0}
          onClick={onSend}
          className={[
            "rounded-md px-3 py-2 text-xs font-medium border transition",
            isSending || draftMessage.trim().length === 0
              ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-surface-400 dark:bg-surface-600 dark:text-slate-500"
              : "border-sky-600 bg-sky-600 text-white hover:bg-sky-700",
          ].join(" ")}
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
};

export default DocumentCommentsPanel;
