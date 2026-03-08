import React from "react";
import type {
  WorkflowTask,
  DocumentMessage,
  ActivityLogItem,
} from "../../../services/documents";
import type { FlowStep } from "./flowConfig";
import WorkflowTaskPanel from "./WorkflowTaskPanel";
import DocumentCommentsPanel from "./DocumentCommentsPanel";
import DocumentActivityPanel from "./DocumentActivityPanel";

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
  isLoadingActivityLogs: boolean;
  activityLogs: ActivityLogItem[];
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
    <div className="space-y-3">
      <WorkflowTaskPanel
        isTasksReady={isTasksReady}
        currentStep={currentStep}
        nextStep={nextStep}
        assignedOfficeId={assignedOfficeId}
        myOfficeId={myOfficeId}
        currentTask={currentTask}
        canAct={canAct}
        isBurstPolling={isBurstPolling}
        stopBurstPolling={stopBurstPolling}
      />

      {/* Comments / Activity tabs */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-surface-400 dark:bg-surface-500">
        {/* Tab bar */}
        <div className="flex border-b border-slate-200 dark:border-surface-400 mb-3">
          {(["comments", "logs"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSideTab(tab)}
              className={[
                "-mb-px px-3 py-2 text-xs font-medium border border-b-0 rounded-t-md transition",
                activeSideTab === tab
                  ? "border-slate-200 bg-white text-slate-900 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-100"
                  : "border-transparent bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-surface-400",
              ].join(" ")}
            >
              {tab === "comments" ? "Comments" : "Activity"}
            </button>
          ))}
        </div>

        {activeSideTab === "comments" ? (
          <DocumentCommentsPanel
            isLoading={isLoadingMessages}
            messages={messages}
            draftMessage={draftMessage}
            setDraftMessage={setDraftMessage}
            isSending={isSendingMessage}
            onSend={onSendMessage}
            formatWhen={formatWhen}
          />
        ) : (
          <DocumentActivityPanel
            isLoading={isLoadingActivityLogs}
            logs={activityLogs}
            formatWhen={formatWhen}
          />
        )}
      </div>
    </div>
  );
};

export default WorkflowInboxCard;
