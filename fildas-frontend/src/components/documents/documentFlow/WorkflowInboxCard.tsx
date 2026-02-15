import React from "react";
import Skeleton from "../../ui/loader/Skeleton";
import type {
  DocumentMessage,
  WorkflowTask,
} from "../../../services/documents";
import type { ActivityLogItem } from "../../../services/documents";
import type { FlowStep } from "./flowConfig";

type Props = {
  isTasksReady: boolean;
  isBurstPolling: boolean;
  stopBurstPolling: () => void;

  currentStep: FlowStep;
  nextStep: FlowStep | null;

  assignedOfficeId: number | null;
  myOfficeId: number | null;
  currentTask: WorkflowTask | null;
  canAct: boolean;

  activeSideTab: "comments" | "logs";
  setActiveSideTab: (v: "comments" | "logs") => void;

  // Activity tab
  isLoadingActivityLogs: boolean;
  activityLogs: ActivityLogItem[];

  // Comments tab
  isLoadingMessages: boolean;
  messages: DocumentMessage[];
  draftMessage: string;
  setDraftMessage: (v: string) => void;
  isSendingMessage: boolean;
  onSendMessage: () => Promise<void>;

  formatWhen: (iso: string) => string;
};

const WorkflowInboxCard: React.FC<Props> = ({
  isTasksReady,
  isBurstPolling,
  stopBurstPolling,
  currentStep,
  nextStep,
  assignedOfficeId,
  myOfficeId,
  currentTask,
  canAct,
  activeSideTab,
  setActiveSideTab,
  isLoadingActivityLogs,
  activityLogs,
  isLoadingMessages,
  messages,
  draftMessage,
  setDraftMessage,
  isSendingMessage,
  onSendMessage,
  formatWhen,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Workflow inbox
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {isTasksReady ? currentStep.label : "Loading step…"}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            {nextStep ? `Next: ${nextStep.label}` : "No next step"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              !isTasksReady
                ? "bg-slate-100 text-slate-500"
                : canAct
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {!isTasksReady
              ? "Checking…"
              : canAct
                ? "Action enabled"
                : "View only"}
          </span>

          {isBurstPolling && (
            <button
              type="button"
              onClick={stopBurstPolling}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
            >
              Stop live updates
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
        {!isTasksReady ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <p className="text-[11px] text-slate-600">
              Assigned:{" "}
              <span className="font-medium text-slate-800">
                {assignedOfficeId ?? "-"}
              </span>
              {"  "}•{"  "}
              You:{" "}
              <span className="font-medium text-slate-800">
                {myOfficeId ?? "-"}
              </span>
            </p>

            {!currentTask && (
              <p className="mt-1 text-[11px] text-rose-600">
                No open workflow task found for this version.
              </p>
            )}

            {currentTask && !canAct && (
              <p className="mt-1 text-[11px] text-slate-600">
                You can view this document, but only the assigned office can
                perform workflow actions.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-4">
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSideTab("comments")}
            className={`-mb-px px-3 py-2 text-xs font-medium border border-slate-200 border-b-0 rounded-t-md ${
              activeSideTab === "comments"
                ? "border-slate-200 bg-white text-slate-900"
                : "border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Comments
          </button>

          <button
            type="button"
            onClick={() => setActiveSideTab("logs")}
            className={`-mb-px px-3 py-2 text-xs font-medium border border-slate-200 border-b-0 rounded-t-md ${
              activeSideTab === "logs"
                ? "border-slate-200 bg-white text-slate-900"
                : "border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Activity
          </button>
        </div>

        {activeSideTab === "logs" ? (
          <div className="mt-3 space-y-2">
            {isLoadingActivityLogs ? (
              <div className="h-44 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No activity yet.</p>
            ) : (
              <div className="h-44 overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                {activityLogs.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
                  >
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">{l.event}</span>
                      {l.label ? ` — ${l.label}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {l.created_at ? `When: ${formatWhen(l.created_at)}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {isLoadingMessages ? (
              <div className="h-44 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-500">No comments yet.</p>
            ) : (
              <div className="h-44 overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl bg-white/80 border border-slate-200 px-3 py-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">
                        {m.sender?.full_name ?? "Unknown"} —{" "}
                        {m.sender?.role?.name ?? "-"} —{" "}
                        {formatWhen(m.created_at)}
                      </p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {m.type}
                      </span>
                    </div>

                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 shadow-sm"
                rows={2}
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Write a comment…"
              />
              <button
                type="button"
                disabled={isSendingMessage || draftMessage.trim().length === 0}
                className={`rounded-md px-3 py-2 text-xs font-medium border ${
                  isSendingMessage || draftMessage.trim().length === 0
                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "border-sky-600 bg-sky-600 text-white hover:bg-sky-700"
                }`}
                onClick={onSendMessage}
              >
                {isSendingMessage ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowInboxCard;
