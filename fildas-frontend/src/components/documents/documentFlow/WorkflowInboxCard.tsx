import React from "react";
import type {
  WorkflowTask,
  DocumentMessage,
  ActivityLogItem,
  Office,
} from "../../../services/documents";
import type { FlowStep } from "./flowConfig";
import WorkflowTaskPanel from "./WorkflowTaskPanel";
import DocumentCommentsPanel from "./DocumentCommentsPanel";
import DocumentActivityPanel from "./DocumentActivityPanel";

type Props = {
  isTasksReady: boolean;
  isBurstPolling: boolean;
  stopBurstPolling: () => void;
  taskChanged: boolean;
  clearTaskChanged: () => void;
  newMessageCount: number;
  clearNewMessageCount: () => void;
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
  offices: Office[];
};

const PANEL_HEIGHTS = [192, 280, 380, 500];

const PanelHeightButton: React.FC<{
  heightIndex: number;
  setHeightIndex: (i: number) => void;
}> = ({ heightIndex, setHeightIndex }) => {
  const canGrow = heightIndex < PANEL_HEIGHTS.length - 1;
  const canShrink = heightIndex > 0;
  return (
    <div className="flex items-center gap-0.5 mb-1">
      <button
        type="button"
        disabled={!canShrink}
        onClick={() => setHeightIndex(heightIndex - 1)}
        className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
        title="Shrink panel"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>
      <button
        type="button"
        disabled={!canGrow}
        onClick={() => setHeightIndex(heightIndex + 1)}
        className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
        title="Expand panel"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>
  );
};

const WorkflowInboxCard: React.FC<Props> = ({
  isTasksReady,
  isBurstPolling,
  stopBurstPolling,
  taskChanged,
  clearTaskChanged,
  newMessageCount,
  clearNewMessageCount,
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
  offices,
}) => {
  const [heightIndex, setHeightIndex] = React.useState(0);

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
        taskChanged={taskChanged}
        clearTaskChanged={clearTaskChanged}
        offices={offices}
      />

      {/* Comments / Activity tabs */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500">
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-400 px-3 pt-2 pb-0">
          <div className="flex">
            {(["comments", "logs"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveSideTab(tab);
                  if (tab === "comments") clearNewMessageCount();
                }}
                className={[
                  "px-3 py-2 text-xs font-medium border-b-2 transition",
                  activeSideTab === tab
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                ].join(" ")}
              >
                {tab === "comments" ? "Comments" : "Activity"}
                {tab === "comments" && newMessageCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                    +{newMessageCount}
                  </span>
                )}
                {tab === "comments" &&
                  newMessageCount === 0 &&
                  messages.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-sky-100 dark:bg-sky-900/40 px-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      {messages.length}
                    </span>
                  )}
              </button>
            ))}
          </div>
          {/* Height stepper */}
          <PanelHeightButton
            heightIndex={heightIndex}
            setHeightIndex={setHeightIndex}
          />
        </div>

        <div className="p-3">
          {activeSideTab === "comments" ? (
            <DocumentCommentsPanel
              isLoading={isLoadingMessages}
              messages={messages}
              draftMessage={draftMessage}
              setDraftMessage={setDraftMessage}
              isSending={isSendingMessage}
              onSend={onSendMessage}
              formatWhen={formatWhen}
              panelHeight={PANEL_HEIGHTS[heightIndex]}
            />
          ) : (
            <DocumentActivityPanel
              isLoading={isLoadingActivityLogs}
              logs={activityLogs}
              formatWhen={formatWhen}
              panelHeight={PANEL_HEIGHTS[heightIndex]}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowInboxCard;
