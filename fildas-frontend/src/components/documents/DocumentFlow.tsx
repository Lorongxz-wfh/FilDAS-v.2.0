import React from "react";
import WorkflowProgressCard from "./documentFlow/WorkflowProgressCard";
import WorkflowInboxCard from "./documentFlow/WorkflowInboxCard";
import DocumentPreviewPanel from "./documentFlow/DocumentPreviewPanel";
import type { WorkflowActionCode } from "../../services/documents";

import type {
  Document,
  DocumentVersion,
  WorkflowTask,
  DocumentMessage,
  Office,
} from "../../services/documents";

import { getCurrentUserOfficeId } from "../../services/documents";

import { useToast } from "../ui/toast/ToastContext";

import {
  listOffices,
  getDocumentPreviewLink,
  getDocumentRouteSteps,
  type DocumentRouteStep,
  submitWorkflowAction,
  listWorkflowTasks,
  listActivityLogs,
  listDocumentMessages,
  postDocumentMessage,
  replaceDocumentVersionFileWithProgress,
  updateDocumentTitle,
  updateDocumentVersionDescription,
  updateDocumentVersionEffectiveDate,
  downloadDocument,
  deleteDraftVersion,
  type ActivityLogItem,
} from "../../services/documents";

import {
  phases,
  flowStepsOffice,
  flowStepsQa,
  transitionsCustom,
  transitionsOffice,
  transitionsQa,
} from "./documentFlow/flowConfig";

import {
  buildCustomFlowSteps,
  findCurrentStep,
  formatWhen,
  officeIdByCode,
  phaseOrder,
  toWorkflowAction,
} from "./documentFlow/flowUtils";

export type HeaderActionButton = {
  key: string;
  label: string;
  variant: "primary" | "danger" | "outline";
  disabled?: boolean;
  onClick: () => Promise<void> | void;
};

export type DocumentFlowHeaderState = {
  title: string;
  code: string;
  status: string;
  versionNumber: number;
  canAct: boolean;
  headerActions: HeaderActionButton[]; // forward/return actions
  versionActions: HeaderActionButton[]; // download/delete/cancel
};

interface DocumentFlowProps {
  document: Document;
  version: DocumentVersion;
  onChanged?: () => Promise<void> | void;
  onHeaderStateChange?: (s: DocumentFlowHeaderState) => void;
  onAfterActionClose?: () => void; // NEW
}

const DocumentFlow: React.FC<DocumentFlowProps> = ({
  document,
  version,
  onChanged,
  onHeaderStateChange,
  onAfterActionClose,
}) => {
  const [localVersion, setLocalVersion] = React.useState(version);
  const [localTitle, setLocalTitle] = React.useState(document.title);
  const [initialTitle, setInitialTitle] = React.useState(document.title);
  const [localDesc, setLocalDesc] = React.useState(version.description ?? "");
  const [initialDesc, setInitialDesc] = React.useState(
    version.description ?? "",
  );

  // Effective date (stored as YYYY-MM-DD)
  const [localEffectiveDate, setLocalEffectiveDate] = React.useState<string>(
    String((version as any)?.effective_date ?? "").slice(0, 10),
  );
  const [initialEffectiveDate, setInitialEffectiveDate] =
    React.useState<string>(
      String((version as any)?.effective_date ?? "").slice(0, 10),
    );

  const [offices, setOffices] = React.useState<Office[]>([]);

  const [routeSteps, setRouteSteps] = React.useState<DocumentRouteStep[]>([]);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      try {
        const res = await getDocumentRouteSteps(localVersion.id);
        if (!alive) return;
        setRouteSteps(Array.isArray(res.steps) ? res.steps : []);
      } catch (e) {
        // If endpoint is missing or forbidden, just treat as "no custom route"
        if (!alive) return;
        setRouteSteps([]);
      } finally {
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [localVersion.id]);

  React.useEffect(() => {
    setLocalVersion(version);
    setInitialTitle(document.title);
    setLocalTitle(document.title);

    setInitialDesc(version.description ?? "");
    setLocalDesc(version.description ?? "");

    setInitialEffectiveDate(
      String((version as any)?.effective_date ?? "").slice(0, 10),
    );
    setLocalEffectiveDate(
      String((version as any)?.effective_date ?? "").slice(0, 10),
    );
  }, [document.id, version.id]);

  const { push } = useToast();
  const userOfficeId = getCurrentUserOfficeId();
  const myOfficeId = userOfficeId;

  // offices loads async; don't compute qaOfficeId until offices exists
  const qaOfficeId = offices?.length ? officeIdByCode(offices, "QA") : null;
  const isQAOfficeUser = !!qaOfficeId && myOfficeId === qaOfficeId;

  const isQAStep = [
    "Draft",
    "For QA Final Check",
    "For QA Registration",
    "For QA Distribution",
    "QA_EDIT",
  ].includes(localVersion.status);

  const canEditEffectiveDate = isQAOfficeUser && isQAStep;

  const onHeaderStateChangeRef = React.useRef(onHeaderStateChange);

  React.useEffect(() => {
    onHeaderStateChangeRef.current = onHeaderStateChange;
  }, [onHeaderStateChange]);

  const [isUploading, setIsUploading] = React.useState(false);
  const [tasks, setTasks] = React.useState<WorkflowTask[]>([]);
  const [isTasksReady, setIsTasksReady] = React.useState(false);
  const [messages, setMessages] = React.useState<DocumentMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [activityLogs, setActivityLogs] = React.useState<ActivityLogItem[]>([]);
  const [isLoadingActivityLogs, setIsLoadingActivityLogs] =
    React.useState(false);

  const [draftMessage, setDraftMessage] = React.useState("");
  const [isSendingMessage, setIsSendingMessage] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isChangingStatus, setIsChangingStatus] = React.useState(false);

  const [isBurstPolling, setIsBurstPolling] = React.useState(false);

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
        const data = await listOffices();
        if (alive) setOffices(data);
      } catch (e) {
        // Don’t break the page if this fails; routing buttons will simply not appear
        console.error("Failed to load offices for routing", e);
        if (alive) setOffices([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!localVersion.preview_path) {
          if (alive) {
            setIsPreviewLoading(false);
            setSignedPreviewUrl("");
          }
          setPreviewNonce((n) => n + 1);

          return;
        }

        if (alive) setIsPreviewLoading(true);

        const res = await getDocumentPreviewLink(localVersion.id);
        if (alive) {
          setSignedPreviewUrl(res.url);
          setIsPreviewLoading(false);
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
  }, [localVersion.id, localVersion.preview_path]);

  const refreshForPreview = async () => {
    // Avoid refetching the whole version; just re-request a new signed URL + reload iframe.
    setPreviewNonce((n) => n + 1);
  };

  const stopBurstPolling = React.useCallback(() => {
    setIsBurstPolling(false);

    if (burstPollRef.current) window.clearInterval(burstPollRef.current);
    burstPollRef.current = null;

    if (burstTimeoutRef.current) window.clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = null;
  }, []);

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
      push({
        type: "success",
        title: "Upload complete",
        message: "File replaced successfully. Preview updating…",
      });
    } catch (error) {
      console.error("Upload error:", error);
      push({
        type: "error",
        title: "Upload failed",
        message: (error as Error).message,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  React.useEffect(() => {
    let alive = true;

    setIsTasksReady(false);

    (async () => {
      try {
        const t = await listWorkflowTasks(localVersion.id);
        if (alive) setTasks(t);
      } catch (e) {
        console.error("Failed to load tasks", e);
        if (alive) setTasks([]);
      } finally {
        if (alive) setIsTasksReady(true);
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

  React.useEffect(() => {
    let alive = true;

    if (activeSideTab !== "logs") {
      setActivityLogs([]);
      setIsLoadingActivityLogs(false);
      return;
    }

    (async () => {
      setIsLoadingActivityLogs(true);
      try {
        const page = await listActivityLogs({
          scope: "document",
          document_version_id: localVersion.id,
          per_page: 50,
        });
        if (alive) setActivityLogs(page.data);
      } catch (e) {
        console.error("Failed to load activity logs", e);
        if (alive) setActivityLogs([]);
      } finally {
        if (alive) setIsLoadingActivityLogs(false);
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

  const descSaveTimerRef = React.useRef<number | null>(null);
  const effectiveDateSaveTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const editable = localVersion.status === "Draft";

    if (!editable) return;
    if (localDesc === initialDesc) return;

    if (descSaveTimerRef.current) window.clearTimeout(descSaveTimerRef.current);

    descSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const updated = await updateDocumentVersionDescription(
          localVersion.id,
          localDesc,
        );

        setLocalVersion((prev) => ({ ...prev, ...updated }));
        setInitialDesc(localDesc);

        if (onChanged) await onChanged();
      } catch (e) {
        console.error("Auto-save description failed", e);
      }
    }, 600);

    return () => {
      if (descSaveTimerRef.current)
        window.clearTimeout(descSaveTimerRef.current);
    };
  }, [localDesc, initialDesc, localVersion.id, localVersion.status, onChanged]);

  React.useEffect(() => {
    // Auto-save title only while Draft version exists
    if (localVersion.status !== "Draft") return;

    if (localTitle === initialTitle) return;

    if (titleSaveTimerRef.current)
      window.clearTimeout(titleSaveTimerRef.current);

    titleSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveTitleOnly({ title: localTitle });
        setInitialTitle(localTitle);
        if (onChanged) await onChanged();
      } catch (e) {
        console.error("Auto-save title failed", e);
      }
    }, 600);

    return () => {
      if (titleSaveTimerRef.current)
        window.clearTimeout(titleSaveTimerRef.current);
    };
  }, [localTitle, localVersion.status, document.id, initialTitle]);

  React.useEffect(() => {
    if (!canEditEffectiveDate) return;

    if (localEffectiveDate === initialEffectiveDate) return;

    if (effectiveDateSaveTimerRef.current)
      window.clearTimeout(effectiveDateSaveTimerRef.current);

    effectiveDateSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const updated = await updateDocumentVersionEffectiveDate(
          localVersion.id,
          localEffectiveDate.trim() ? localEffectiveDate.trim() : null,
        );

        setLocalVersion((prev) => ({ ...prev, ...updated }));
        setInitialEffectiveDate(localEffectiveDate);
        if (onChanged) await onChanged();
      } catch (e) {
        console.error("Auto-save effective date failed", e);
      }
    }, 600);

    return () => {
      if (effectiveDateSaveTimerRef.current)
        window.clearTimeout(effectiveDateSaveTimerRef.current);
    };
  }, [
    canEditEffectiveDate,
    localEffectiveDate,
    initialEffectiveDate,
    localVersion.id,
    onChanged,
  ]);

  // Update fileSelect to set pending file for revisions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      await uploadFile(file);
    }
  };

  const workflowType = String(
    (localVersion as any)?.workflow_type ??
      (localVersion as any)?.workflowType ??
      (localVersion as any)?.workflowtype ??
      "",
  ).toLowerCase();

  const officeStatuses = new Set([
    "Office Draft",
    "For Office Head Review",
    "For VP Review (Office)",
    "For QA Approval (Office)",
    "For Office Approval (Office)",
    "For VP Approval (Office)",
    "For President Approval (Office)",
    "For QA Registration (Office)",
    "For QA Distribution (Office)",
  ]);

  const isCustomRouting = routeSteps.length > 0;

  const isOfficeFlow =
    workflowType === "office" || officeStatuses.has(localVersion.status);

  const fallbackFlowSteps = isOfficeFlow ? flowStepsOffice : flowStepsQa;
  const activeTransitions = isCustomRouting
    ? transitionsCustom
    : isOfficeFlow
      ? transitionsOffice
      : transitionsQa;

  const ownerOfficeIdForFlow =
    (document as any)?.owner_office_id ??
    (document as any)?.ownerOfficeId ??
    null;

  const customFlowSteps =
    routeSteps.length > 0
      ? buildCustomFlowSteps({
          offices,
          ownerOfficeId: ownerOfficeIdForFlow,
          routeSteps,
        })
      : null;

  const activeFlowSteps = customFlowSteps ?? fallbackFlowSteps;

  const [currentTask, setCurrentTask] = React.useState<WorkflowTask | null>(
    null,
  );

  // For custom routing, prefer task.step + assigned office to decide current step.
  const currentStep = (() => {
    if (isCustomRouting && currentTask?.step) {
      const assignedId = currentTask?.assigned_office_id ?? null;

      // Custom loop steps: our UI ids are now "custom_review_office:{officeId}" etc.
      if (currentTask.step === "custom_review_office" && assignedId) {
        const hit = activeFlowSteps.find(
          (s) => s.id === `custom_review_office:${Number(assignedId)}`,
        );
        if (hit) return hit;
      }

      if (currentTask.step === "custom_approval_office" && assignedId) {
        const hit = activeFlowSteps.find(
          (s) => s.id === `custom_approval_office:${Number(assignedId)}`,
        );
        if (hit) return hit;
      }

      // Non-loop steps should match exactly (draft, back-to-originator, registration, distribution, distributed)
      const exact = activeFlowSteps.find((s) => s.id === currentTask.step);
      if (exact) return exact;
    }

    return findCurrentStep(localVersion.status, activeFlowSteps);
  })();

  const currentPhase =
    phases.find((p) => p.id === currentStep.phase) ?? phases[0];
  const currentPhaseIndex = phaseOrder(phases, currentPhase.id);
  const currentGlobalIndex = activeFlowSteps.findIndex(
    (s) => s.id === currentStep.id,
  );
  const nextStep =
    currentGlobalIndex >= 0
      ? (activeFlowSteps[currentGlobalIndex + 1] ?? null)
      : null;

  React.useEffect(() => {
    if (!tasks.length) {
      setCurrentTask(null);
      return;
    }
    const open = tasks.find((t) => t.status === "open") ?? tasks[0] ?? null;
    setCurrentTask(open);
  }, [tasks]);

  // userOfficeId / myOfficeId / canEditEffectiveDate are already computed above

  const assignedOfficeId = currentTask?.assigned_office_id ?? null;

  // These come from backend fields; keep them tolerant to naming differences.
  const ownerOfficeId =
    (document as any)?.owner_office_id ??
    (document as any)?.office_id ??
    (version as any)?.owner_office_id ??
    (localVersion as any)?.owner_office_id ??
    null;

  const reviewOfficeId =
    (document as any)?.review_office_id ??
    (version as any)?.review_office_id ??
    (localVersion as any)?.review_office_id ??
    null;

  // Can I act? Only if my office is the one assigned on the open task.
  const canAct = !!assignedOfficeId && myOfficeId === assignedOfficeId;

  // Build actions for the current status / task.
  type TransitionAction = { toStatus: string; label: string };
  type CustomAction = {
    toStatus: WorkflowActionCode;
    label: string;
  };

  const availableActions: TransitionAction[] | CustomAction[] = (() => {
    const s = localVersion.status;

    if (isCustomRouting) {
      const step = String(currentTask?.step ?? "");

      if (step === "draft") {
        return [{ toStatus: "SENDTOOFFICEREVIEW", label: "Send for review" }];
      }

      if (step === "custom_review_office") {
        return [
          { toStatus: "FORWARDTOVPREVIEW", label: "Forward to next reviewer" },
          { toStatus: "RETURNTOQAEDIT", label: "Return to edit" },
        ];
      }

      if (step === "custom_review_back_to_originator") {
        return [
          { toStatus: "STARTOFFICEAPPROVAL", label: "Start approval phase" },
          { toStatus: "RETURNTOQAEDIT", label: "Return to edit" },
        ];
      }

      if (step === "custom_approval_office") {
        return [
          {
            toStatus: "FORWARDTOVPAPPROVAL",
            label: "Forward to next approver",
          },
          { toStatus: "RETURNTOQAEDIT", label: "Return to edit" },
        ];
      }

      if (step === "custom_approval_back_to_originator") {
        return [
          {
            toStatus: "FORWARDTOQAREGISTRATION",
            label: "Proceed to registration",
          },
          { toStatus: "RETURNTOQAEDIT", label: "Return to edit" },
        ];
      }

      if (step === "custom_registration") {
        return [
          {
            toStatus: "FORWARDTOQADISTRIBUTION",
            label: "Proceed to distribution",
          },
          { toStatus: "RETURNTOQAEDIT", label: "Return to edit" },
        ];
      }

      if (step === "custom_distribution") {
        return [
          { toStatus: "MARKDISTRIBUTED", label: "Mark as distributed" },
          { toStatus: "RETURNTOQAEDIT", label: "Return to edit" },
        ];
      }

      return [];
    }

    return activeTransitions[s] ?? [];
  })();

  const fullCode = document.code ?? "CODE-NOT-AVAILABLE";

  const headerActions: HeaderActionButton[] = availableActions.map((action) => {
    const isDanger =
      action.toStatus === "RETURNTOQAEDIT" ||
      action.toStatus === "RETURNTOOFFICEEDIT";

    return {
      key: action.toStatus,
      label: action.label,
      variant: isDanger ? "danger" : "primary",

      disabled: isChangingStatus || !canAct,
      onClick: async () => {
        // In custom routing, backend advances by currentTask.step (action string just needs to be valid).
        const resolveActionCode = (
          a: TransitionAction | CustomAction,
        ): WorkflowActionCode | null => {
          if (!isCustomRouting) return toWorkflowAction(a.toStatus);

          // custom routing: toStatus is already a backend action code
          return (a as CustomAction).toStatus;
        };

        const code = resolveActionCode(action);

        if (!code) {
          push({
            type: "error",
            title: "Action unavailable",
            message: "Action not mapped yet.",
          });
          return;
        }

        let note: string | null = null;

        if (
          action.toStatus === "RETURNTOQAEDIT" ||
          action.toStatus === "RETURNTOOFFICEEDIT"
        ) {
          note = window.prompt("Return note (required):", "");
          if (note === null) return;
          if (note.trim().length === 0) {
            push({
              type: "warning",
              title: "Missing note",
              message: "Return note is required.",
            });
            return;
          }
        }

        const ok = window.confirm(`${action.label}?`);
        if (!ok) return;

        setIsChangingStatus(true);
        try {
          let extra: { review_office_id?: number | null } | undefined =
            undefined;

          // When QA sends to Office Review: use office selected during Create page.
          // Prefer review_office_id if backend already set it; otherwise fallback to owner office.
          if (code === "SENDTOOFFICEREVIEW" && !isCustomRouting) {
            const targetOfficeId = reviewOfficeId ?? ownerOfficeId ?? null;

            if (!targetOfficeId) {
              push({
                type: "error",
                title: "Missing office",
                message: "No reviewer office is set for this document.",
              });
              return;
            }

            extra = { review_office_id: targetOfficeId };
          }

          const res = await submitWorkflowAction(
            localVersion.id,
            code,
            note ?? undefined,
            extra,
          );

          setLocalVersion((prev) => ({ ...prev, ...res.version }));

          push({
            type: "success",
            title: "Workflow updated",
            message: res.action_message || "Action completed.",
          });

          // Refresh notifications badge/list in this tab (receivers will see via polling in their own session)
          window.dispatchEvent(new Event("notifications:refresh"));

          setTasks(await listWorkflowTasks(res.version.id));

          if (activeSideTab === "comments") {
            setMessages(await listDocumentMessages(res.version.id));
          }

          if (activeSideTab === "logs") {
            const page = await listActivityLogs({
              scope: "document",
              document_version_id: res.version.id,
              per_page: 50,
            });
            setActivityLogs(page.data);
          }

          if (
            action.toStatus === "RETURNTOQAEDIT" ||
            action.toStatus === "RETURNTOOFFICEEDIT"
          ) {
            setActiveSideTab("comments");
          }

          if (onChanged) await onChanged();

          // Auto-close after acting for Office/VP/President (QA stays on the doc)
          const qaOfficeId = officeIdByCode(offices, "QA");
          if (qaOfficeId && myOfficeId !== qaOfficeId) {
            onAfterActionClose?.();
          }
        } catch (e) {
          push({
            type: "error",
            title: "Action failed",
            message: (e as Error).message,
          });
        } finally {
          setIsChangingStatus(false);
        }
      },
    };
  });

  const headerActionsSorted = React.useMemo(() => {
    const priority: Record<string, number> = {
      // QA flow
      "For Office Review": 10,
      "For VP Review": 20,
      "For QA Final Check": 30,
      "For Office Approval": 40,
      "For VP Approval": 50,
      "For President Approval": 60,
      "For QA Registration": 70,
      "For QA Distribution": 80,

      // Office-start flow
      "For Office Head Review": 12,
      "For VP Review (Office)": 22,
      "For QA Approval (Office)": 28,
      "For Office Approval (Office)": 42,
      "For VP Approval (Office)": 52,
      "For President Approval (Office)": 62,
      "For QA Registration (Office)": 72,
      "For QA Distribution (Office)": 82,

      Distributed: 90,
      QA_EDIT: 999,
      OFFICE_EDIT: 999,
    };

    return [...headerActions].sort((a, b) => {
      const pa = priority[a.key] ?? 500;
      const pb = priority[b.key] ?? 500;
      return pa - pb;
    });
  }, [headerActions]);

  const headerActionsSig = headerActionsSorted
    .map((a) => `${a.key}:${a.disabled ? 1 : 0}`)
    .join("|");

  const versionActions: HeaderActionButton[] = React.useMemo(() => {
    const actions: HeaderActionButton[] = [];

    if (localVersion.status === "Distributed" && localVersion.file_path) {
      actions.push({
        key: "download",
        label: "Download",
        variant: "outline",
        onClick: async () => {
          try {
            await downloadDocument(localVersion);
          } catch (e: any) {
            push({
              type: "error",
              title: "Download failed",
              message: e?.message || "Download failed",
            });
          }
        },
      });
    }

    if (
      localVersion.status === "Draft" &&
      Number(localVersion.version_number) === 0
    ) {
      actions.push({
        key: "delete_draft",
        label: "Delete draft",
        variant: "danger",
        onClick: async () => {
          try {
            const msg =
              "Delete this draft? (This will remove the whole document draft)";
            if (!confirm(msg)) return;

            await deleteDraftVersion(localVersion.id);
            onAfterActionClose?.();
          } catch (e: any) {
            push({
              type: "error",
              title: "Delete failed",
              message: e?.message || "Delete failed",
            });
          }
        },
      });
    }

    if (
      localVersion.status === "Draft" &&
      Number(localVersion.version_number) > 0
    ) {
      actions.push({
        key: "cancel_revision",
        label: "Cancel revision",
        variant: "danger",
        onClick: async () => {
          try {
            const msg =
              "Cancel this revision draft? (This will delete the draft revision and return to the last official version.)";
            if (!confirm(msg)) return;

            await deleteDraftVersion(localVersion.id);

            // Tell parent to reload versions + switch selection away from this deleted version
            if (onChanged) await onChanged();

            // Close the view (so you naturally go back to the list / previous version)
            onAfterActionClose?.();
          } catch (e: any) {
            push({
              type: "error",
              title: "Cancel failed",
              message: e?.message || "Cancel failed",
            });
          }
        },
      });
    }

    return actions;
  }, [
    localVersion.status,
    localVersion.file_path,
    localVersion.id,
    localVersion.version_number,
    localVersion.original_filename, // optional, only if your download name depends on it
    push,
    onChanged,
    onAfterActionClose,
  ]);

  const versionActionsSig = versionActions
    .map((a) => `${a.key}:${a.disabled ? 1 : 0}`)
    .join("|");

  React.useEffect(() => {
    const fn = onHeaderStateChangeRef.current;
    if (!fn) return;

    fn({
      title: localVersion.status === "Draft" ? localTitle : document.title,
      code: fullCode,
      status: localVersion.status,
      versionNumber: Number(localVersion.version_number),
      canAct,
      headerActions: headerActionsSorted,
      versionActions,
    });
  }, [
    document.title,
    fullCode,
    localTitle,
    localVersion.status,
    localVersion.version_number,
    canAct,
    headerActionsSig,
    versionActionsSig,
  ]);

  // UI

  return (
    <section className="space-y-6">
      {/* Workflow progress */}
      <WorkflowProgressCard
        phases={phases}
        routeStepsCount={routeSteps.length}
        isTasksReady={isTasksReady}
        currentStep={currentStep}
        nextStep={nextStep}
        currentPhaseIndex={currentPhaseIndex}
        currentGlobalIndex={currentGlobalIndex}
        currentPhaseId={currentPhase.id}
        activeFlowSteps={activeFlowSteps}
      />

      {/* 3. Title + code + status + notes and 4. Preview */}
      <div className="mt-4 grid gap-6 lg:grid-cols-[320px,1fr]">
        {/* left: meta + notes */}
        <div className="space-y-4">
          <WorkflowInboxCard
            isTasksReady={isTasksReady}
            isBurstPolling={isBurstPolling}
            stopBurstPolling={stopBurstPolling}
            currentStep={currentStep}
            nextStep={nextStep}
            assignedOfficeId={assignedOfficeId}
            myOfficeId={myOfficeId}
            currentTask={currentTask}
            canAct={canAct}
            activeSideTab={activeSideTab}
            setActiveSideTab={setActiveSideTab}
            isLoadingActivityLogs={isLoadingActivityLogs}
            activityLogs={activityLogs}
            isLoadingMessages={isLoadingMessages}
            messages={messages}
            draftMessage={draftMessage}
            setDraftMessage={setDraftMessage}
            isSendingMessage={isSendingMessage}
            onSendMessage={async () => {
              const text = draftMessage.trim();
              if (!text) return;

              setIsSendingMessage(true);
              try {
                await postDocumentMessage(localVersion.id, {
                  message: text,
                  type: "comment",
                });
                setDraftMessage("");
                setMessages(await listDocumentMessages(localVersion.id));
              } catch (e) {
                alert((e as Error).message);
              } finally {
                setIsSendingMessage(false);
              }
            }}
            formatWhen={formatWhen}
          />
        </div>

        {/* right: document preview */}
        <DocumentPreviewPanel
          versionId={localVersion.id}
          previewPath={localVersion.preview_path ?? null}
          filePath={localVersion.file_path ?? null}
          originalFilename={localVersion.original_filename ?? null}
          status={localVersion.status}
          signedPreviewUrl={signedPreviewUrl}
          previewNonce={previewNonce}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          isPreviewLoading={isPreviewLoading}
          setIsPreviewLoading={setIsPreviewLoading}
          fileInputRef={fileInputRef}
          onOpenPreview={async () => {
            const res = await getDocumentPreviewLink(localVersion.id);
            window.open(res.url, "_blank");
          }}
          onClickReplace={() => {
            fileInputRef.current?.click();
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileSelect={handleFileSelect}
        />
      </div>
    </section>
  );
};

export default DocumentFlow;
