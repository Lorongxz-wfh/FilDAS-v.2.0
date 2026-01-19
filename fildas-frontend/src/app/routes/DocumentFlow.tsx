import React from "react";
import type { Document } from "../../services/documents";
import { getDocumentPreviewUrl } from "../../services/documents";

// TEMP: direct API call; later you can move this to documents service
const API_BASE = "http://localhost:8000/api"; // make sure this matches Laravel

async function updateDocumentStatus(
  id: number,
  status: string,
  notes?: string | null,
) {
  const token = localStorage.getItem("auth_token");

  await fetch(`${API_BASE}/documents/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      status,
      current_step_notes: notes ?? undefined,
    }),
  });
}

interface DocumentFlowProps {
  document: Document;
}

type PhaseId = "review" | "approval" | "distribution";

interface Phase {
  id: PhaseId;
  label: string;
}

interface FlowStep {
  id: string;
  label: string;
  statusValue: string;
  phase: PhaseId;
}

const phases: Phase[] = [
  { id: "review", label: "Review" },
  { id: "approval", label: "Approval" },
  { id: "distribution", label: "Distribution" },
];

const flowSteps: FlowStep[] = [
  // Review
  {
    id: "draft",
    label: "Drafted by QA",
    statusValue: "Draft",
    phase: "review",
  },
  {
    id: "dept_review",
    label: "Department review",
    statusValue: "For Department Review",
    phase: "review",
  },
  {
    id: "vpaa_review",
    label: "VPAA review",
    statusValue: "For VPAA Review",
    phase: "review",
  },

  // Approval
  {
    id: "dept_approval",
    label: "Department approval",
    statusValue: "For Department Approval",
    phase: "approval",
  },
  {
    id: "vpaa_approval",
    label: "VPAA approval",
    statusValue: "For VPAA Approval",
    phase: "approval",
  },
  {
    id: "pres_approval",
    label: "President approval",
    statusValue: "For President Approval",
    phase: "approval",
  },

  // Distribution
  {
    id: "qa_distribution",
    label: "QA distribution",
    statusValue: "For QA Distribution",
    phase: "distribution",
  },
  {
    id: "distributed",
    label: "Distributed",
    statusValue: "Distributed",
    phase: "distribution",
  },
];

type TransitionAction = {
  toStatus: string;
  label: string;
};

const transitions: Record<string, TransitionAction[]> = {
  // Review phase
  Draft: [
    {
      toStatus: "For Department Review",
      label: "Send to Department for review",
    },
  ],
  "For Department Review": [
    {
      toStatus: "For VPAA Review",
      label: "Forward to VPAA for review",
    },
    {
      toStatus: "Draft",
      label: "Return to QA",
    },
  ],
  "For VPAA Review": [
    {
      toStatus: "For Department Approval",
      label: "Start approval phase (Department approval)",
    },
    {
      toStatus: "Draft",
      label: "Return to QA",
    },
  ],

  // Approval phase
  "For Department Approval": [
    {
      toStatus: "For VPAA Approval",
      label: "Forward to VPAA for approval",
    },
    {
      toStatus: "Draft",
      label: "Return to QA review",
    },
  ],
  "For VPAA Approval": [
    {
      toStatus: "For President Approval",
      label: "Forward to President for approval",
    },
    {
      toStatus: "Draft",
      label: "Return to QA review",
    },
  ],
  "For President Approval": [
    {
      toStatus: "For QA Distribution",
      label: "Forward to QA for distribution",
    },
    {
      toStatus: "Draft",
      label: "Return to QA review",
    },
  ],

  // Distribution phase
  "For QA Distribution": [
    {
      toStatus: "Distributed",
      label: "Mark as distributed",
    },
    {
      toStatus: "Draft",
      label: "Return to QA review",
    },
  ],
  Distributed: [],
};

function findCurrentStep(status: string): FlowStep {
  const found = flowSteps.find((s) => s.statusValue === status);
  return found ?? flowSteps[0];
}

function phaseOrder(phaseId: PhaseId): number {
  return phases.findIndex((p) => p.id === phaseId);
}

const DocumentFlow: React.FC<DocumentFlowProps> = ({ document }) => {
  const [localDocument, setLocalDocument] = React.useState(document);

  const previewUrl = getDocumentPreviewUrl(localDocument.id);
  const currentStep = findCurrentStep(localDocument.status);
  const currentPhase = phases.find((p) => p.id === currentStep.phase)!;
  const currentPhaseIndex = phaseOrder(currentPhase.id);

  const currentGlobalIndex = flowSteps.findIndex(
    (s) => s.id === currentStep.id,
  );
  const nextStep = flowSteps[currentGlobalIndex + 1] ?? null;

  const availableActions =
    transitions[localDocument.status as keyof typeof transitions] ?? [];

  const fullCode = localDocument.code ?? "CODE-NOT-AVAILABLE";

  return (
    <section className="space-y-6">
      {/* 1. Phase bar */}
      <div className="flex justify-center">
        <div className="flex items-center gap-8">
          {phases.map((phase, index) => {
            const isCurrent = index === currentPhaseIndex;
            const isCompleted = index < currentPhaseIndex;

            return (
              <React.Fragment key={phase.id}>
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
                    isCurrent
                      ? "bg-sky-50 text-sky-700"
                      : isCompleted
                        ? "text-slate-500"
                        : "text-slate-400"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isCurrent
                        ? "bg-sky-500"
                        : isCompleted
                          ? "bg-emerald-400"
                          : "bg-slate-300"
                    }`}
                  />
                  <span>{phase.label}</span>
                </div>

                {index < phases.length - 1 && (
                  <div className="h-px w-16 bg-slate-200" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 2. Steps (current phase only, horizontal) */}
      <div className="flex justify-center">
        <div className="mt-4 w-full max-w-5xl rounded-xl border border-slate-200 bg-white px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {currentPhase.label} phase
          </p>

          <div className="mt-3 flex items-center gap-4">
            {flowSteps
              .filter((s) => s.phase === currentPhase.id)
              .map((step, index, arr) => {
                const stepIndex = flowSteps.findIndex((s) => s.id === step.id);
                const isCurrent = step.id === currentStep.id;
                const isCompleted = stepIndex < currentGlobalIndex;

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                          isCurrent
                            ? "bg-sky-600 text-white"
                            : isCompleted
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`whitespace-nowrap text-xs ${
                          isCurrent
                            ? "text-sky-700"
                            : isCompleted
                              ? "text-slate-500"
                              : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>

                    {index < arr.length - 1 && (
                      <div
                        className={`h-px flex-1 ${
                          isCompleted
                            ? "bg-emerald-400"
                            : isCurrent
                              ? "bg-sky-300"
                              : "bg-slate-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
          </div>
        </div>
      </div>

      {/* 3. Title + code + status + notes and 4. Preview */}
      <div className="mt-4 grid gap-6 lg:grid-cols-[320px,1fr]">
        {/* left: meta + notes */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              {document.title}
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {fullCode}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Status:{" "}
              <span className="font-semibold text-slate-900">
                {document.status}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Type:{" "}
              <span className="font-semibold text-slate-900">
                {document.doctype}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current step
            </h2>
            <p className="mt-1 text-sm text-slate-800">{currentStep.label}</p>
            {nextStep && (
              <p className="mt-0.5 text-xs text-slate-500">
                Next: {nextStep.label}
              </p>
            )}

            {availableActions.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {availableActions.map((action, index) => (
                  <button
                    key={action.toStatus}
                    type="button"
                    className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium ${
                      index === 0
                        ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={async () => {
                      await updateDocumentStatus(
                        localDocument.id,
                        action.toStatus,
                        localDocument.current_step_notes ?? null,
                      );

                      setLocalDocument((prev) => ({
                        ...prev,
                        status: action.toStatus,
                      }));
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            <h2 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notes / comments
            </h2>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              rows={3}
              value={localDocument.current_step_notes ?? ""}
              onChange={(e) =>
                setLocalDocument((prev) => ({
                  ...prev,
                  current_step_notes: e.target.value,
                }))
              }
            />
          </div>
        </div>

        {/* right: document preview */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Document preview
          </h2>
          <div className="h-[600px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {document.preview_path ? (
              <iframe
                src={previewUrl}
                title="Document preview"
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Preview not available for this document.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DocumentFlow;
