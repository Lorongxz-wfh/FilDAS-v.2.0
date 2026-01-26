import React from "react";
import UploadProgress from "../ui/loader/UploadProgress";
import InlineSpinner from "../ui/loader/InlineSpinner";
import type {
  Document,
  DocumentVersion,
  WorkflowTask,
  DocumentMessage,
} from "../../services/documents";

import { getCurrentUserOfficeId } from "../../services/documents";

import {
  getDocumentPreviewLink,
  getDocumentVersion,
  submitWorkflowAction,
  listWorkflowTasks,
  listDocumentMessages,
  postDocumentMessage,
  replaceDocumentVersionFileWithProgress,
  updateDocumentTitle,
  downloadDocument,
  deleteDraftVersion,
  cancelRevision,
} from "../../services/documents";

interface DocumentFlowProps {
  document: Document;
  version: DocumentVersion;
  onChanged?: () => Promise<void> | void;
}

type PhaseId = "review" | "approval" | "registration";

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
  { id: "registration", label: "Registration / Distribution" },
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
    id: "vpaareview",
    label: "VPAA review",
    statusValue: "For VPAA Review",
    phase: "review",
  },
  {
    id: "qafinalcheck",
    label: "QA final check",
    statusValue: "For QA Final Check",
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
    phase: "registration",
  },
  {
    id: "distributed",
    label: "Distributed",
    statusValue: "Distributed",
    phase: "registration",
  },
];

type TransitionAction = {
  toStatus: string;
  label: string;
};

const transitions: Record<string, TransitionAction[]> = {
  // Review phase
  Draft: [
    // ✅ Explicit Draft
    {
      toStatus: "For Department Review",
      label: "Send to Department for review",
    },
  ],
  "Revision-Draft": [
    // ✅ Explicit Revision-Draft
    {
      toStatus: "For Department Review",
      label: "Send to Department for review (revision)",
    },
  ],

  "For Department Review": [
    {
      toStatus: "For VPAA Review",
      label: "Forward to VPAA for review",
    },
    {
      toStatus: "QA_EDIT",
      label: "Return to QA (edit)",
    },
  ],
  "For VPAA Review": [
    {
      toStatus: "For QA Final Check",
      label: "Send back to QA for final check",
    },
    { toStatus: "QA_EDIT", label: "Return to QA edit" },
  ],

  "For QA Final Check": [
    {
      toStatus: "For Department Approval",
      label: "Start approval phase (Department approval)",
    },
    { toStatus: "QA_EDIT", label: "Return to QA edit" },
  ],

  // Approval phase
  "For Department Approval": [
    {
      toStatus: "For VPAA Approval",
      label: "Forward to VPAA for approval",
    },
    {
      toStatus: "QA_EDIT",
      label: "Return to QA (edit)",
    },
  ],
  "For VPAA Approval": [
    {
      toStatus: "For President Approval",
      label: "Forward to President for approval",
    },
    {
      toStatus: "QA_EDIT",
      label: "Return to QA (edit)",
    },
  ],
  "For President Approval": [
    {
      toStatus: "For QA Distribution",
      label: "Forward to QA for distribution",
    },
    {
      toStatus: "QA_EDIT",
      label: "Return to QA (edit)",
    },
  ],

  // Distribution phase
  "For QA Distribution": [
    {
      toStatus: "Distributed",
      label: "Mark as distributed",
    },
    {
      toStatus: "QA_EDIT",
      label: "Return to QA (edit)",
    },
  ],
  Distributed: [],
};

function toWorkflowAction(toStatus: string): string | null {
  switch (toStatus) {
    case "For Department Review":
      return "SEND_TO_DEPT_REVIEW";
    case "For VPAA Review":
      return "FORWARD_TO_VPAA_REVIEW";
    case "For QA Final Check":
      return "VPAA_SEND_BACK_TO_QA_FINAL_CHECK";
    case "For Department Approval":
      return "START_DEPT_APPROVAL";
    case "For VPAA Approval":
      return "FORWARD_TO_VPAA_APPROVAL";
    case "For President Approval":
      return "FORWARD_TO_PRESIDENT_APPROVAL";
    case "For QA Distribution":
      return "FORWARD_TO_QA_DISTRIBUTION";
    case "Distributed":
      return "MARK_DISTRIBUTED";
    case "QA_EDIT":
      return "RETURN_TO_QA_EDIT";
    default:
      return null;
  }
}

function expectedOfficeIdForToStatus(
  toStatus: string,
  ownerOfficeId: number | null | undefined,
): number | null {
  switch (toStatus) {
    case "For Department Review":
    case "For Department Approval":
      return ownerOfficeId ?? null;

    case "For VPAA Review":
    case "For VPAA Approval":
      return 17; // VPAA office id

    case "For President Approval":
      return 1; // President office id

    case "For QA Final Check":
    case "For QA Distribution":
    case "Distributed":
    case "QA_EDIT":
      return 44; // QA office id

    default:
      return null;
  }
}

function findCurrentStep(status: string): FlowStep {
  const found = flowSteps.find((s) => s.statusValue === status);
  return found ?? flowSteps[0];
}

function phaseOrder(phaseId: PhaseId): number {
  return phases.findIndex((p) => p.id === phaseId);
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const DocumentFlow: React.FC<DocumentFlowProps> = ({
  document,
  version,
  onChanged,
}) => {
  const [localVersion, setLocalVersion] = React.useState(version);
  const [localTitle, setLocalTitle] = React.useState(document.title);
  const [initialTitle, setInitialTitle] = React.useState(document.title);

  React.useEffect(() => {
    setLocalVersion(version);
    setInitialTitle(document.title);
    setLocalTitle(document.title);
  }, [document.id, version.id]);

  const [isUploading, setIsUploading] = React.useState(false);
  const [isSavingTitle, setIsSavingTitle] = React.useState(false);
  const [tasks, setTasks] = React.useState<WorkflowTask[]>([]);
  const [isTasksReady, setIsTasksReady] = React.useState(false);
  const [messages, setMessages] = React.useState<DocumentMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);

  const [draftMessage, setDraftMessage] = React.useState("");
  const [isSendingMessage, setIsSendingMessage] = React.useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isChangingStatus, setIsChangingStatus] = React.useState(false);

  const [isBurstPolling, setIsBurstPolling] = React.useState(false);

  const defaultPollRef = React.useRef<number | null>(null);
  const burstPollRef = React.useRef<number | null>(null);
  const burstTimeoutRef = React.useRef<number | null>(null);

  const [activeSideTab, setActiveSideTab] = React.useState<"comments" | "logs">(
    "comments",
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [previewNonce, setPreviewNonce] = React.useState(0);

  const [signedPreviewUrl, setSignedPreviewUrl] = React.useState<string>("");

  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!localVersion.preview_path) {
          if (alive) {
            setIsPreviewLoading(false);
            setSignedPreviewUrl("");
          }
          return;
        }

        const res = await getDocumentPreviewLink(localVersion.id);
        if (alive) {
          setIsPreviewLoading(true);
          setSignedPreviewUrl(res.url);
        }
      } catch (e) {
        console.error("Failed to load signed preview url", e);
        if (alive) {
          setIsPreviewLoading(false);
          setSignedPreviewUrl("");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [localVersion.id, localVersion.preview_path, previewNonce]);

  const refreshForPreview = async () => {
    const { version: fresh } = await getDocumentVersion(localVersion.id);
    setLocalVersion((prev) => ({
      ...prev,
      file_path: fresh.file_path,
      preview_path: fresh.preview_path,
      original_filename: fresh.original_filename,
    }));

    setPreviewNonce((n) => n + 1); // reload iframe
  };

  const refreshAll = React.useCallback(async () => {
    const { version: freshVersion } = await getDocumentVersion(localVersion.id);

    setLocalVersion((prev) => {
      const statusChanged = prev.status !== freshVersion.status;
      const previewChanged =
        prev.preview_path !== freshVersion.preview_path ||
        prev.file_path !== freshVersion.file_path;

      // If preview changed, bump nonce so iframe reloads
      if (previewChanged) setPreviewNonce((n) => n + 1);

      // Optional: if status changed, you can auto-switch to logs
      // if (statusChanged) setActiveSideTab("logs");

      return {
        ...prev,
        ...freshVersion,
      };
    });

    // Keep tasks/messages synced (tasks always, because permissions depend on it)
    setTasks(await listWorkflowTasks(localVersion.id));

    if (activeSideTab === "comments") {
      setMessages(await listDocumentMessages(localVersion.id));
    }
  }, [localVersion.id, activeSideTab]);

  const stopBurstPolling = React.useCallback(() => {
    setIsBurstPolling(false);

    if (burstPollRef.current) window.clearInterval(burstPollRef.current);
    burstPollRef.current = null;

    if (burstTimeoutRef.current) window.clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = null;
  }, []);

  const startBurstPolling = React.useCallback(() => {
    stopBurstPolling();
    setIsBurstPolling(true);

    burstPollRef.current = window.setInterval(() => {
      refreshAll().catch(() => {});
    }, 1000);

    // auto-stop after 25 seconds (tune as you like)
    burstTimeoutRef.current = window.setTimeout(() => {
      stopBurstPolling();
    }, 25000);
  }, [refreshAll, stopBurstPolling]);

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
    setUploadProgress(0);

    try {
      await replaceDocumentVersionFileWithProgress(
        localVersion.id,
        file,
        (pct) => setUploadProgress(pct),
      );

      await refreshForPreview();
      alert("File replaced successfully! Preview updating...");
    } catch (error) {
      console.error("Upload error:", error);
      alert(`File upload failed: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleReplaceFileClick = () => {
    fileInputRef.current?.click();
  };

  React.useEffect(() => {
    let alive = true;

    setIsTasksReady(false);

    (async () => {
      setIsLoadingTasks(true);
      try {
        const t = await listWorkflowTasks(localVersion.id);
        if (alive) setTasks(t);
      } catch (e) {
        console.error("Failed to load tasks", e);
        if (alive) setTasks([]);
      } finally {
        if (alive) {
          setIsLoadingTasks(false);
          setIsTasksReady(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [localVersion.id]);

  React.useEffect(() => {
    let alive = true;

    if (activeSideTab !== "comments") {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    (async () => {
      setIsLoadingMessages(true);
      try {
        const m = await listDocumentMessages(localVersion.id);
        if (alive) setMessages(m);
      } catch (e) {
        console.error("Failed to load messages", e);
        if (alive) setMessages([]);
      } finally {
        if (alive) setIsLoadingMessages(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [localVersion.id, activeSideTab]);

  async function saveTitleOnly(opts: { title: string }) {
    await updateDocumentTitle(document.id, opts.title);
  }

  const titleSaveTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Auto-save title only while Draft version exists
    if (localVersion.status !== "Draft") return;

    if (localTitle === initialTitle) return;

    if (titleSaveTimerRef.current)
      window.clearTimeout(titleSaveTimerRef.current);

    titleSaveTimerRef.current = window.setTimeout(async () => {
      setIsSavingTitle(true);
      try {
        await saveTitleOnly({ title: localTitle });
        setInitialTitle(localTitle);
        if (onChanged) await onChanged();
      } catch (e) {
        console.error("Auto-save title failed", e);
      } finally {
        setIsSavingTitle(false);
      }
    }, 600);

    return () => {
      if (titleSaveTimerRef.current)
        window.clearTimeout(titleSaveTimerRef.current);
    };
  }, [localTitle, localVersion.status, document.id, initialTitle]);

  // Update fileSelect to set pending file for revisions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      await uploadFile(file);
    }
  };

  const currentStep = findCurrentStep(localVersion.status);
  const currentPhase = phases.find((p) => p.id === currentStep.phase)!;
  const currentPhaseIndex = phaseOrder(currentPhase.id);

  const currentGlobalIndex = flowSteps.findIndex(
    (s) => s.id === currentStep.id,
  );
  const nextStep = flowSteps[currentGlobalIndex + 1] ?? null;

  const [currentTask, setCurrentTask] = React.useState<WorkflowTask | null>(
    null,
  );

  React.useEffect(() => {
    if (!tasks.length) {
      setCurrentTask(null);
      return;
    }
    const open = tasks.find((t) => t.status === "open") ?? tasks[0] ?? null;
    setCurrentTask(open);
  }, [tasks]);

  const userOfficeId = getCurrentUserOfficeId(); // if you already expose this on frontend

  const canAct =
    isTasksReady &&
    !!currentTask &&
    !!currentTask.assigned_office_id &&
    currentTask.assigned_office_id === userOfficeId;

  const ownerOfficeId =
    (document as any)?.owner_office_id ??
    (document as any)?.ownerOffice?.id ??
    null;

  const availableActionsRaw =
    transitions[localVersion.status as keyof typeof transitions] ?? [];

  // Only show actions that the CURRENT assigned office is allowed to perform
  const availableActions = availableActionsRaw.filter((a) => {
    // If we don't have a current task yet, hide actions (prevents “everyone sees everything”)
    if (!currentTask?.assigned_office_id) return false;

    const expected = expectedOfficeIdForToStatus(a.toStatus, ownerOfficeId);

    // If we can't determine expected office, keep it hidden for safety
    if (!expected) return false;

    return expected === currentTask.assigned_office_id;
  });

  const assignedOfficeId = currentTask?.assigned_office_id ?? null;
  const myOfficeId = userOfficeId;
  const fullCode = document.code ?? "CODE-NOT-AVAILABLE";

  // UI

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
            {localVersion.status === "Draft" ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="Enter document title"
                  />
                  {isSavingTitle && (
                    <span className="ml-1 text-slate-400">
                      <InlineSpinner />
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {fullCode}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                  {document.title}
                </h1>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {fullCode}
                </p>
              </>
            )}

            {/* Action buttons (version-level) */}
            <div className="mt-3 flex flex-wrap gap-2">
              {localVersion.status === "Distributed" &&
                localVersion.file_path && (
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={async () => {
                      try {
                        await downloadDocument(localVersion);
                      } catch (e: any) {
                        alert(e.message || "Download failed");
                      }
                    }}
                  >
                    Download
                  </button>
                )}

              {localVersion.status === "Draft" &&
                Number(localVersion.version_number) === 0 && (
                  <button
                    type="button"
                    className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    onClick={async () => {
                      try {
                        const msg =
                          "Delete this draft? (This will remove the whole document draft)";
                        if (!confirm(msg)) return;

                        await deleteDraftVersion(localVersion.id);

                        // Let the page refresh versions + redirect selection logic
                        if (onChanged) await onChanged();
                      } catch (e: any) {
                        alert(e.message || "Delete failed");
                      }
                    }}
                  >
                    Delete draft
                  </button>
                )}

              {localVersion.status === "Draft" &&
                Number(localVersion.version_number) > 0 && (
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={async () => {
                      try {
                        if (!confirm("Cancel this revision draft?")) return;
                        await cancelRevision(localVersion.id);

                        // Parent should reload versions + select the correct latest/previous version
                        if (onChanged) await onChanged();
                      } catch (e: any) {
                        alert(e.message || "Cancel failed");
                      }
                    }}
                  >
                    Cancel revision
                  </button>
                )}
            </div>

            {/* Metadata row */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div>
                <span className="font-medium text-slate-600">Version:</span> v
                {localVersion.version_number}
              </div>
              <div>
                <span className="font-medium text-slate-600">Updated:</span>{" "}
                {formatWhen(localVersion.updated_at)}
              </div>
              <div>
                <span className="font-medium text-slate-600">Created:</span>{" "}
                {formatWhen(localVersion.created_at)}
              </div>
              <div>
                <span className="font-medium text-slate-600">Distributed:</span>{" "}
                {localVersion.distributed_at
                  ? formatWhen(localVersion.distributed_at)
                  : "-"}
              </div>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              Status:{" "}
              <span className="font-semibold text-slate-900">
                {localVersion.status}
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

            <p className="mt-2 text-xs text-slate-500">
              Assigned to office ID: {assignedOfficeId ?? "-"} (You:{" "}
              {myOfficeId || "-"})
            </p>
            {!isTasksReady && (
              <p className="mt-1 text-[11px] text-slate-400">
                Checking permissions…
              </p>
            )}

            {isBurstPolling && (
              <button
                type="button"
                onClick={stopBurstPolling}
                className="mt-2 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Stop live updates
              </button>
            )}

            {availableActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {availableActions.map((action) => (
                  <button
                    key={action.toStatus}
                    type="button"
                    disabled={isChangingStatus || !canAct}
                    className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium border ${
                      isChangingStatus || !canAct
                        ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                        : action.toStatus === "QA_EDIT"
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : action.toStatus === "Distributed"
                            ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border-sky-600 bg-sky-600 text-white hover:bg-sky-700"
                    }`}
                    onClick={async () => {
                      const code = toWorkflowAction(action.toStatus);
                      if (!code) {
                        alert("Action not mapped yet.");
                        return;
                      }

                      let note: string | null = null;

                      if (action.toStatus === "QA_EDIT") {
                        note = window.prompt("Return note (required):", "");

                        if (note === null) return; // user cancelled
                        if (note.trim().length === 0) {
                          alert("Return note is required.");
                          return;
                        }
                      }

                      const ok = window.confirm(`${action.label}?`);
                      if (!ok) return;

                      setIsChangingStatus(true);
                      try {
                        const updated = await submitWorkflowAction(
                          localVersion.id,
                          code,
                          note ?? undefined,
                        );

                        // Fast UI update: only version status changes immediately
                        setLocalVersion((prev) => ({ ...prev, ...updated }));

                        // Lazy refresh: only refresh the active tab, not everything
                        if (activeSideTab === "logs") {
                          setTasks(await listWorkflowTasks(updated.id));
                        }
                        if (activeSideTab === "comments") {
                          setMessages(await listDocumentMessages(updated.id));
                        }

                        // No burst polling by default (this was multiplying calls)
                        if (onChanged) await onChanged();
                      } catch (e) {
                        alert((e as Error).message);
                      } finally {
                        setIsChangingStatus(false);
                      }
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isChangingStatus && (
                        <InlineSpinner className="h-3 w-3 border-2" />
                      )}
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

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
                  Workflow logs
                </button>
              </div>

              {activeSideTab === "logs" ? (
                <div className="mt-3">
                  {isLoadingTasks ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Loading workflow tasks…
                    </p>
                  ) : tasks.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      No workflow tasks yet.
                    </p>
                  ) : (
                    <div className="h-56 overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                      {tasks.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
                        >
                          <p className="text-xs text-slate-700">
                            <span className="font-semibold">{t.phase}</span> /{" "}
                            {t.step} — {t.status}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Opened:{" "}
                            {t.opened_at ? formatWhen(t.opened_at) : "-"}
                            {t.completed_at
                              ? ` • Completed: ${formatWhen(t.completed_at)}`
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {isLoadingMessages ? (
                    <p className="text-xs text-slate-500">Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-slate-500">No messages yet.</p>
                  ) : (
                    <div className="h-56 overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
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
                      disabled={
                        isSendingMessage || draftMessage.trim().length === 0
                      }
                      className={`rounded-md px-3 py-2 text-xs font-medium border ${
                        isSendingMessage || draftMessage.trim().length === 0
                          ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                          : "border-sky-600 bg-sky-600 text-white hover:bg-sky-700"
                      }`}
                      onClick={async () => {
                        const text = draftMessage.trim();
                        if (!text) return;

                        setIsSendingMessage(true);
                        try {
                          await postDocumentMessage(localVersion.id, {
                            message: text,
                            type: "comment",
                          });
                          setDraftMessage("");
                          setMessages(
                            await listDocumentMessages(localVersion.id),
                          );
                        } catch (e) {
                          alert((e as Error).message);
                        } finally {
                          setIsSendingMessage(false);
                        }
                      }}
                    >
                      {isSendingMessage ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* right: document preview */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center justify-between">
            Document preview
          </h2>

          <button
            type="button"
            onClick={async () => {
              try {
                const res = await getDocumentPreviewLink(localVersion.id);
                window.open(res.url, "_blank");
              } catch (e: any) {
                alert(e.message || "Failed to open preview");
              }
            }}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors ml-2"
          >
            Open preview
          </button>

          <div
            className={`relative h-150 w-full overflow-hidden rounded-xl border-2 transition-all ${
              localVersion.file_path
                ? "border-slate-200 bg-white cursor-pointer hover:border-sky-300 hover:shadow-md"
                : "border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-sky-400 hover:bg-sky-50"
            }`}
            onClick={() => {
              if (isUploading) return;
              fileInputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {localVersion.file_path && localVersion.preview_path ? (
              <iframe
                key={`${localVersion.id}-${previewNonce}`}
                src={signedPreviewUrl || "about:blank"}
                title="Document preview"
                className="h-full w-full"
                onLoad={() => setIsPreviewLoading(false)}
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
                  {localVersion.file_path
                    ? "Click to replace document"
                    : "Upload new document"}
                </p>
                <p className="text-slate-500 mb-4">
                  {localVersion.file_path
                    ? "Drag & drop or click to replace the current file"
                    : "Drag & drop PDF, Word, Excel, PowerPoint, or click to browse (max 10MB)"}
                </p>
                {localVersion.file_path && (
                  <p className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {localVersion.original_filename}
                  </p>
                )}
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-md">
                  <p className="mb-3 text-sm font-medium text-slate-700">
                    {uploadProgress >= 100 ? "Processing..." : "Uploading..."}
                  </p>
                  <UploadProgress value={uploadProgress} />
                </div>
              </div>
            )}

            {isPreviewLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                <InlineSpinner className="h-8 w-8 border-2" />
              </div>
            )}

            {/* ✅ ALWAYS VISIBLE - end of preview div */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="sr-only"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DocumentFlow;
