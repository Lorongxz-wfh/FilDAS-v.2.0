import React from "react";
import Skeleton from "../../ui/loader/Skeleton";
import type { FlowStep, Phase, PhaseId } from "./flowConfig";

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
}) => {
  const currentPhase = phases.find((p) => p.id === currentPhaseId) ?? phases[0];

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Workflow progress
            </p>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                routeStepsCount > 0
                  ? "bg-violet-50 text-violet-700 border border-violet-200"
                  : "bg-slate-50 text-slate-600 border border-slate-200"
              }`}
              title={routeStepsCount > 0 ? "Custom routing" : "Default routing"}
            >
              {routeStepsCount > 0 ? "Custom" : "Default"}
            </span>
          </div>

          {!isTasksReady ? (
            <Skeleton className="mt-1 h-5 w-52" />
          ) : (
            <>
              <p className="mt-1 text-[11px] text-slate-500">Current step</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {currentStep.label}
              </p>
            </>
          )}
        </div>

        <div className="text-right">
          <p className="text-[11px] text-slate-500">Next step</p>
          {!isTasksReady ? (
            <Skeleton className="mt-1 h-4 w-28 ml-auto" />
          ) : nextStep ? (
            <p className="mt-0.5 text-xs font-semibold text-slate-900">
              {nextStep.label}
            </p>
          ) : (
            <p className="mt-0.5 text-xs font-semibold text-slate-400">—</p>
          )}
        </div>
      </div>

      {/* Phase rail */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {phases.map((phase, index) => {
          const isCurrent = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex;

          return (
            <div
              key={phase.id}
              className={`rounded-xl border px-4 py-3 ${
                isCurrent
                  ? "border-sky-200 bg-sky-50"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isCurrent
                        ? "bg-sky-600"
                        : isCompleted
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold truncate ${
                      isCurrent
                        ? "text-sky-800"
                        : isCompleted
                          ? "text-slate-700"
                          : "text-slate-500"
                    }`}
                    title={phase.label}
                  >
                    {phase.label}
                  </span>
                </div>

                {isCurrent && (
                  <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                    Current
                  </span>
                )}

                {!isCurrent && isCompleted && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Done
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Steps timeline (current phase only) */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {currentPhase.label} steps
          </p>

          {nextStep ? (
            <p className="text-[11px] text-slate-500">
              Next:{" "}
              <span className="font-medium text-slate-700">
                {nextStep.label}
              </span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">No next step</p>
          )}
        </div>

        <div className="mt-4 -mx-2 overflow-x-auto px-2">
          <div className="flex w-full justify-center">
            <div className="flex w-max items-center gap-3">
              {(() => {
                const phaseSteps = activeFlowSteps.filter(
                  (s) => s.phase === currentPhaseId,
                );

                if (phaseSteps.length <= 1) {
                  const step = phaseSteps[0] ?? currentStep;
                  const isCurrent = step.id === currentStep.id;

                  return (
                    <div className="flex w-full justify-center">
                      <div className="flex w-56 flex-col items-center text-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shadow-sm ${
                            isCurrent
                              ? "bg-sky-600 text-white"
                              : "bg-white text-slate-600 border border-slate-200"
                          }`}
                        >
                          1
                        </div>

                        <span
                          className={`mt-2 text-[11px] font-medium leading-snug ${
                            isCurrent ? "text-sky-800" : "text-slate-600"
                          }`}
                          title={step.label}
                        >
                          {step.label}
                        </span>
                      </div>
                    </div>
                  );
                }

                return phaseSteps.map((step, index, arr) => {
                  const stepIndex = activeFlowSteps.findIndex(
                    (s) => s.id === step.id,
                  );
                  const isCurrent = step.id === currentStep.id;
                  const isCompleted =
                    currentGlobalIndex >= 0 &&
                    stepIndex >= 0 &&
                    stepIndex < currentGlobalIndex;

                  return (
                    <React.Fragment key={`${step.id}-${index}`}>
                      <div className="flex w-40 flex-col items-center justify-start">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shadow-sm ${
                            isCurrent
                              ? "bg-sky-600 text-white"
                              : isCompleted
                                ? "bg-emerald-500 text-white"
                                : "bg-white text-slate-600 border border-slate-200"
                          }`}
                        >
                          {index + 1}
                        </div>

                        <span
                          className={`mt-2 max-w-40 text-center text-[11px] font-medium leading-snug ${
                            isCurrent
                              ? "text-sky-800"
                              : isCompleted
                                ? "text-slate-700"
                                : "text-slate-500"
                          } line-clamp-2`}
                          title={step.label}
                        >
                          {step.label}
                        </span>
                      </div>

                      {index < arr.length - 1 && (
                        <div className="flex items-center px-1">
                          <div
                            className={`h-1.5 w-10 rounded-full ${
                              isCompleted
                                ? "bg-emerald-400"
                                : isCurrent
                                  ? "bg-sky-300"
                                  : "bg-slate-200"
                            }`}
                          />
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className={`ml-1 h-4 w-4 ${
                              isCompleted
                                ? "text-emerald-400"
                                : isCurrent
                                  ? "text-sky-300"
                                  : "text-slate-300"
                            }`}
                            aria-hidden="true"
                          >
                            <path d="M7.5 4.5 13 10l-5.5 5.5-1.4-1.4L10.2 10 6.1 5.9 7.5 4.5z" />
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowProgressCard;
