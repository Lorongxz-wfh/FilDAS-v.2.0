import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import Skeleton from "../../ui/loader/Skeleton";
import type { FlowStep, Phase, PhaseId } from "./flowConfig";
import type { WorkflowTask } from "../../../services/documents";

type Props = {
  phases: Phase[];
  routeStepsCount: number;
  isTasksReady: boolean;
  currentStep: FlowStep;
  nextStep: FlowStep | null;
  currentPhaseIndex: number;
  currentGlobalIndex: number;
  currentPhaseId: PhaseId;
  activeFlowSteps: FlowStep[];
  tasks: WorkflowTask[];
};

const WorkflowProgressCard: React.FC<Props> = ({
  phases,
  routeStepsCount,
  isTasksReady,
  currentStep,
  nextStep,
  currentPhaseIndex,
  currentGlobalIndex,
  currentPhaseId,
  activeFlowSteps,
  // tasks,
}) => {
  const currentPhase = phases.find((p) => p.id === currentPhaseId) ?? phases[0];

  // Task-based progress across entire flow
  const totalSteps = Math.max(activeFlowSteps.length, 1);
  const completedSteps =
    currentPhaseId === "completed"
      ? totalSteps
      : Math.max(0, currentGlobalIndex);
  const progressPct = Math.min(
    100,
    Math.round((completedSteps / totalSteps) * 100),
  );

  // Collapsed by default on mobile, expanded on desktop
  const [expanded, setExpanded] = React.useState(() => {
    if (typeof window !== "undefined") return window.innerWidth >= 1024;
    return true;
  });

  // Accordion: which phase is open (defaults to current phase)
  const [openPhaseId, setOpenPhaseId] = React.useState<PhaseId | null>(
    currentPhaseId,
  );
  React.useEffect(() => {
    setOpenPhaseId(currentPhaseId);
  }, [currentPhaseId]);

  return (
    <div className="mx-auto w-full max-w-5xl rounded-xl border border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500 overflow-hidden">
      {/* ── Collapsed / header bar ── always visible, click to toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-2.5 transition hover:bg-slate-50 dark:hover:bg-surface-400/40"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: label + routing badge + progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Workflow progress
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  routeStepsCount > 0
                    ? "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800"
                    : "bg-slate-50 text-slate-600 border border-slate-200 dark:bg-surface-400 dark:text-slate-300 dark:border-surface-300"
                }`}
              >
                {routeStepsCount > 0 ? "Custom" : "Default"}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-surface-400 overflow-hidden">
                {!isTasksReady ? (
                  <div className="h-full w-1/3 rounded-full bg-slate-300 dark:bg-surface-300 animate-pulse" />
                ) : (
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                )}
              </div>
              {!isTasksReady ? (
                <div className="h-3 w-16 rounded-full bg-slate-300 dark:bg-surface-300 animate-pulse shrink-0" />
              ) : (
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {currentPhase.label}
                  </span>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {progressPct}%
                  </span>
                </div>
              )}
            </div>

            {/* Current + Next step — shown when collapsed */}
            {!expanded && (
              <div className="mt-1 flex items-center justify-between gap-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {isTasksReady ? (
                    <>
                      Current:{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {currentStep.label}
                      </span>
                    </>
                  ) : (
                    <Skeleton className="h-3 w-40" />
                  )}
                </div>
                {isTasksReady && nextStep && (
                  <div className="shrink-0 max-w-[45%] text-right text-xs text-slate-500 dark:text-slate-400">
                    Next:{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1">
                      {nextStep.label}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: chevron */}
          <div className="shrink-0 flex items-center gap-3">
            <svg
              className={`h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : "rotate-0"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-surface-400">
          {/* Current step detail */}
          <div className="pt-3 flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current step
              </p>
              {!isTasksReady ? (
                <Skeleton className="mt-1 h-5 w-52" />
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {currentStep.label}
                </p>
              )}
            </div>
            <div className="text-right shrink-0 max-w-48">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Next step
              </p>
              {!isTasksReady ? (
                <Skeleton className="mt-1 h-3 w-20 ml-auto" />
              ) : nextStep ? (
                <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100 text-right wrap-break-word">
                  {nextStep.label}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  —
                </p>
              )}
            </div>
          </div>

          {/* Phase accordion */}
          <div className="mt-3 overflow-hidden rounded-md border border-slate-200 dark:border-surface-400 divide-y divide-slate-200 dark:divide-surface-400">
            {!isTasksReady
              ? phases.map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-slate-200 dark:bg-surface-300 animate-pulse" />
                    <div className="h-2.5 flex-1 rounded-full bg-slate-200 dark:bg-surface-300 animate-pulse" />
                    <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-slate-100 dark:bg-surface-400 animate-pulse" />
                  </div>
                ))
              : phases.map((phase, index) => {
                  const isCurrent = index === currentPhaseIndex;
                  const isCompleted = index < currentPhaseIndex;
                  const isOpen = openPhaseId === phase.id;
                  const phaseSteps = activeFlowSteps.filter(
                    (s) => s.phase === phase.id,
                  );

                  return (
                    <div key={phase.id}>
                      {/* Row header */}
                      <button
                        type="button"
                        onClick={() =>
                          setOpenPhaseId(isOpen ? null : phase.id)
                        }
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-surface-400/50"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            isCurrent
                              ? "bg-sky-500"
                              : isCompleted
                                ? "bg-emerald-500"
                                : "bg-slate-300 dark:bg-surface-300"
                          }`}
                        />
                        <span
                          className={`flex-1 min-w-0 text-xs font-semibold ${
                            isCurrent
                              ? "text-sky-800 dark:text-sky-300"
                              : isCompleted
                                ? "text-slate-600 dark:text-slate-300"
                                : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {phase.label}
                        </span>
                        {isCurrent && (
                          <Circle
                            className="shrink-0 h-3.5 w-3.5 text-sky-500 dark:text-sky-400 animate-pulse fill-sky-100 dark:fill-sky-950/60"
                            strokeWidth={2}
                          />
                        )}
                        {!isCurrent && isCompleted && (
                          <CheckCircle2
                            className="shrink-0 h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-950/40"
                            strokeWidth={2}
                          />
                        )}
                        {!isCurrent && !isCompleted && (
                          <Circle
                            className="shrink-0 h-3.5 w-3.5 text-slate-300 dark:text-surface-300"
                            strokeWidth={2}
                          />
                        )}
                        <svg
                          className={`shrink-0 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* Accordion body — steps */}
                      {isOpen && (
                        <div className="border-t border-slate-100 dark:border-surface-400 bg-slate-50/60 dark:bg-surface-600/50 px-3 py-3">
                          {phaseSteps.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-1">
                              No steps
                            </p>
                          ) : (
                            <div className="overflow-x-auto -mx-1 px-1">
                              <div className="flex w-max items-start gap-2 mx-auto">
                                {phaseSteps.map((step, si, arr) => {
                                  const stepIndex =
                                    activeFlowSteps.findIndex(
                                      (s) => s.id === step.id,
                                    );
                                  const stepIsCurrent =
                                    step.id === currentStep.id;
                                  const stepIsCompleted =
                                    currentGlobalIndex >= 0 &&
                                    stepIndex >= 0 &&
                                    stepIndex < currentGlobalIndex;

                                  return (
                                    <React.Fragment key={`${step.id}-${si}`}>
                                      <div
                                        className="flex flex-col items-center"
                                        style={{ width: "76px" }}
                                      >
                                        <div
                                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                                            stepIsCurrent
                                              ? "bg-sky-600 text-white"
                                              : stepIsCompleted
                                                ? "bg-emerald-500 text-white"
                                                : "border border-slate-200 bg-white text-slate-500 dark:border-surface-300 dark:bg-surface-500 dark:text-slate-300"
                                          }`}
                                        >
                                          {si + 1}
                                        </div>
                                        <span
                                          className={`mt-1.5 text-center text-[10px] font-medium leading-tight line-clamp-2 ${
                                            stepIsCurrent
                                              ? "text-sky-800 dark:text-sky-300"
                                              : stepIsCompleted
                                                ? "text-slate-600 dark:text-slate-300"
                                                : "text-slate-400 dark:text-slate-500"
                                          }`}
                                          title={step.label}
                                        >
                                          {step.label}
                                        </span>
                                      </div>
                                      {si < arr.length - 1 && (
                                        <div className="flex items-center mt-3.5 shrink-0">
                                          <div
                                            className={`h-1 w-5 rounded-full ${
                                              stepIsCompleted
                                                ? "bg-emerald-400"
                                                : stepIsCurrent
                                                  ? "bg-sky-300 dark:bg-sky-800"
                                                  : "bg-slate-200 dark:bg-surface-300"
                                            }`}
                                          />
                                          <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className={`ml-0.5 h-3 w-3 ${
                                              stepIsCompleted
                                                ? "text-emerald-400"
                                                : stepIsCurrent
                                                  ? "text-sky-300 dark:text-sky-800"
                                                  : "text-slate-300 dark:text-surface-300"
                                            }`}
                                          >
                                            <path d="M7.5 4.5 13 10l-5.5 5.5-1.4-1.4L10.2 10 6.1 5.9 7.5 4.5z" />
                                          </svg>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowProgressCard;