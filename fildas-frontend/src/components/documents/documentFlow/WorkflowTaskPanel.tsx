import React from "react";
import Skeleton from "../../ui/loader/Skeleton";
import type { WorkflowTask } from "../../../services/documents";
import type { FlowStep } from "./flowConfig";

type Props = {
  isTasksReady: boolean;
  currentStep: FlowStep;
  nextStep: FlowStep | null;
  assignedOfficeId: number | null;
  myOfficeId: number | null;
  currentTask: WorkflowTask | null;
  canAct: boolean;
  isBurstPolling: boolean;
  stopBurstPolling: () => void;
};

const WorkflowTaskPanel: React.FC<Props> = ({
  isTasksReady,
  currentStep,
  nextStep,
  assignedOfficeId,
  myOfficeId,
  currentTask,
  canAct,
  isBurstPolling,
  stopBurstPolling,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-surface-400 dark:bg-surface-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Current task
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {isTasksReady ? currentStep.label : "Loading…"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {nextStep ? `Next: ${nextStep.label}` : "No next step"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              !isTasksReady
                ? "bg-slate-100 text-slate-500 dark:bg-surface-400 dark:text-slate-400"
                : canAct
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-slate-100 text-slate-600 dark:bg-surface-400 dark:text-slate-400",
            ].join(" ")}
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
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Stop live updates
            </button>
          )}
        </div>
      </div>

      {/* Assigned info */}
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-surface-400 dark:bg-surface-600/50">
        {!isTasksReady ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Assigned:{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {assignedOfficeId ?? "—"}
              </span>
              {"  ·  "}
              You:{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {myOfficeId ?? "—"}
              </span>
            </p>

            {!currentTask && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                No open workflow task found for this version.
              </p>
            )}

            {currentTask && !canAct && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Only the assigned office can perform workflow actions.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowTaskPanel;
