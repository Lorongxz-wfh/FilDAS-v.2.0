import React from "react";
import type { Document } from "../../services/documents";
import { getDocumentPreviewUrl, getDocument } from "../../services/documents";

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
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSavingRevision, setIsSavingRevision] = React.useState(false);
  const [pendingFileToUpload, setPendingFileToUpload] =
    React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const previewUrl = getDocumentPreviewUrl(localDocument.id); // ← CORRECT: after localDocument

  // File upload handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file && isValidFile(file)) {
      await uploadFile(file);
    }
  };

  const isValidFile = (file: File): boolean => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    return (
      allowedTypes.some(
        (type) =>
          file.type === type ||
          file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i),
      ) && file.size <= 10 * 1024 * 1024
    ); // 10MB
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("auth_token");

      const response = await fetch(
        `http://localhost:8000/api/documents/${localDocument.id}/replace-file`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      // Refresh document data
      const updatedDoc = await getDocument(localDocument.id);
      setLocalDocument(updatedDoc);
    } catch (error) {
      alert(`File upload failed: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Revision info save (title + file)
  const handleSaveRevisionInfo = async () => {
    setIsSavingRevision(true);

    try {
      const formData = new FormData();
      formData.append("title", localDocument.title);
      if (pendingFileToUpload) {
        formData.append("file", pendingFileToUpload);
      }

      const token = localStorage.getItem("auth_token");

      const response = await fetch(
        `http://localhost:8000/api/documents/${localDocument.id}/revision-info`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }

      // Refresh document data
      const updatedDoc = await getDocument(localDocument.id);
      setLocalDocument(updatedDoc);
      setPendingFileToUpload(null); // Clear pending file
    } catch (error) {
      alert(`Save failed: ${(error as Error).message}`);
    } finally {
      setIsSavingRevision(false);
    }
  };

  const handleReplaceFileClick = () => {
    fileInputRef.current?.click();
  };

  // Update fileSelect to set pending file for revisions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      if (localDocument.status === "Revision-Draft") {
        setPendingFileToUpload(file);
        // Auto-save title + new file
        handleSaveRevisionInfo();
      } else {
        uploadFile(file);
      }
    }
  };

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
            {localDocument.status === "Revision-Draft" ? (
              // REVISION: Editable title + replace button
              <>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="text"
                    value={localDocument.title}
                    onChange={(e) =>
                      setLocalDocument((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="Enter document title"
                  />
                  <button
                    type="button"
                    onClick={handleSaveRevisionInfo}
                    disabled={isSavingRevision}
                    className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isSavingRevision ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-xs text-sky-600 bg-sky-50 px-2 py-1 rounded-full mb-2">
                  Revision v{localDocument.version_number} - Edit title or
                  replace file
                </p>
              </>
            ) : (
              // NORMAL: Read-only title
              <>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                  {localDocument.title}
                </h1>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {fullCode}
                </p>
              </>
            )}

            <p className="mt-2 text-sm text-slate-600">
              Status:{" "}
              <span className="font-semibold text-slate-900">
                {localDocument.status}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Type:{" "}
              <span className="font-semibold text-slate-900">
                {localDocument.doctype}
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
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center justify-between">
            Document preview
            {localDocument.status === "Revision-Draft" &&
              localDocument.file_path && (
                <button
                  type="button"
                  onClick={handleReplaceFileClick}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-200 transition-colors"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                  Change file
                </button>
              )}
          </h2>

          <div
            className={`h-[600px] w-full overflow-hidden rounded-xl border-2 transition-all ${
              localDocument.file_path
                ? "border-slate-200 bg-white cursor-pointer hover:border-sky-300 hover:shadow-md"
                : "border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-sky-400 hover:bg-sky-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {localDocument.file_path && localDocument.preview_path ? (
              <iframe
                src={previewUrl}
                title="Document preview"
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm">
                <div className="mb-3 h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="mb-1 font-medium text-slate-900">
                  {localDocument.file_path
                    ? "Click to replace document"
                    : "Upload new document"}
                </p>
                <p className="text-slate-500 mb-4">
                  {localDocument.file_path
                    ? "Drag & drop or click to replace the current file"
                    : "Drag & drop PDF, Word, Excel, PowerPoint, or click to browse (max 10MB)"}
                </p>
                {localDocument.file_path && (
                  <p className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {localDocument.original_filename}
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-2"></div>
                  <p className="text-sm text-slate-600">Uploading...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DocumentFlow;
