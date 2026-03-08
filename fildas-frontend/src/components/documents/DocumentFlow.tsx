import React from "react";
import WorkflowProgressCard from "./documentFlow/WorkflowProgressCard";
import WorkflowInboxCard from "./documentFlow/WorkflowInboxCard";
import DocumentPreviewPanel from "./documentFlow/DocumentPreviewPanel";

import {
  type Document,
  type DocumentVersion,
  type WorkflowTask,
  type Office,
  getCurrentUserOfficeId,
  listOffices,
  getDocumentPreviewLink,
  getDocumentRouteSteps,
  type DocumentRouteStep,
  deleteDraftVersion,
  downloadDocument,
  postDocumentMessage,
} from "../../services/documents";

import { useToast } from "../ui/toast/ToastContext";
import { useDocumentWorkflow } from "../../hooks/useDocumentWorkflow";
import { useDocumentAutoSave } from "../../hooks/useDocumentAutoSave";
import { useDocumentFileUpload } from "../../hooks/useDocumentFileUpload";

import {
  phases,
  flowStepsOffice,
  flowStepsQa,
} from "./documentFlow/flowConfig";
import {
  buildCustomFlowSteps,
  findCurrentStep,
  formatWhen,
  officeIdByCode,
  phaseOrder,
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
  headerActions: HeaderActionButton[];
  versionActions: HeaderActionButton[];
};

interface DocumentFlowProps {
  document: Document;
  version: DocumentVersion;
  onChanged?: () => Promise<void> | void;
  onHeaderStateChange?: (s: DocumentFlowHeaderState) => void;
  onAfterActionClose?: () => void;
}

const DocumentFlow: React.FC<DocumentFlowProps> = ({
  document,
  version,
  onChanged,
  onHeaderStateChange,
  onAfterActionClose,
}) => {
  const { push } = useToast();
  const myOfficeId = getCurrentUserOfficeId();

  // ── Local version + field state ──────────────────────────────
  const [localVersion, setLocalVersion] = React.useState(version);
  const [localTitle, setLocalTitle] = React.useState(document.title);
  const [initialTitle, setInitialTitle] = React.useState(document.title);
  const [localDesc, setLocalDesc] = React.useState(version.description ?? "");
  const [initialDesc, setInitialDesc] = React.useState(
    version.description ?? "",
  );
  const [localEffectiveDate, setLocalEffectiveDate] = React.useState(
    String((version as any)?.effective_date ?? "").slice(0, 10),
  );
  const [initialEffectiveDate, setInitialEffectiveDate] = React.useState(
    String((version as any)?.effective_date ?? "").slice(0, 10),
  );

  // ── Offices + route steps ────────────────────────────────────
  const [offices, setOffices] = React.useState<Office[]>([]);
  const [routeSteps, setRouteSteps] = React.useState<DocumentRouteStep[]>([]);

  React.useEffect(() => {
    let alive = true;
    listOffices()
      .then((d) => {
        if (alive) setOffices(d);
      })
      .catch(() => {
        if (alive) setOffices([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    getDocumentRouteSteps(localVersion.id)
      .then((r) => {
        if (alive) setRouteSteps(Array.isArray(r.steps) ? r.steps : []);
      })
      .catch(() => {
        if (alive) setRouteSteps([]);
      });
    return () => {
      alive = false;
    };
  }, [localVersion.id]);

  // ── Sync when version prop changes ───────────────────────────
  React.useEffect(() => {
    setLocalVersion(version);
    setLocalTitle(document.title);
    setInitialTitle(document.title);
    setLocalDesc(version.description ?? "");
    setInitialDesc(version.description ?? "");
    const ed = String((version as any)?.effective_date ?? "").slice(0, 10);
    setLocalEffectiveDate(ed);
    setInitialEffectiveDate(ed);
  }, [document.id, version.id]);

  // ── Preview ──────────────────────────────────────────────────
  const [signedPreviewUrl, setSignedPreviewUrl] = React.useState("");
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const [previewNonce, setPreviewNonce] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    if (!localVersion.preview_path) {
      setSignedPreviewUrl("");
      setIsPreviewLoading(false);
      setPreviewNonce((n) => n + 1);
      return;
    }
    setIsPreviewLoading(true);
    getDocumentPreviewLink(localVersion.id)
      .then((r) => {
        if (alive) {
          setSignedPreviewUrl(r.url);
          setIsPreviewLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setSignedPreviewUrl("");
          setIsPreviewLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [localVersion.id, localVersion.preview_path]);

  // ── Derived ──────────────────────────────────────────────────
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

  // ── Tabs ─────────────────────────────────────────────────────
  const [activeSideTab, setActiveSideTab] = React.useState<"comments" | "logs">(
    "comments",
  );

  // ── Workflow hook ────────────────────────────────────────────
  const workflow = useDocumentWorkflow({
    versionId: localVersion.id,
    activeSideTab,
    onChanged,
    onAfterActionClose,
    myOfficeId,
    qaOfficeId,
  });

  // ── Auto-save hook ───────────────────────────────────────────
  useDocumentAutoSave({
    documentId: document.id,
    version: localVersion,
    localTitle,
    initialTitle,
    setInitialTitle,
    localDesc,
    initialDesc,
    setInitialDesc,
    localEffectiveDate,
    initialEffectiveDate,
    setInitialEffectiveDate,
    canEditEffectiveDate,
    onVersionUpdated: (v) => setLocalVersion((prev) => ({ ...prev, ...v })),
    onChanged,
  });

  // ── File upload hook ─────────────────────────────────────────
  const fileUpload = useDocumentFileUpload({
    versionId: localVersion.id,
    onUploadComplete: () => setPreviewNonce((n) => n + 1),
  });

  // ── Current task + step ──────────────────────────────────────
  const [currentTask, setCurrentTask] = React.useState<WorkflowTask | null>(
    null,
  );

  React.useEffect(() => {
    if (!workflow.tasks.length) {
      setCurrentTask(null);
      return;
    }
    setCurrentTask(
      workflow.tasks.find((t) => t.status === "open") ??
        workflow.tasks[0] ??
        null,
    );
  }, [workflow.tasks]);

  const isCustomRouting = routeSteps.length > 0;
  const workflowType = String(
    (localVersion as any)?.workflow_type ?? "",
  ).toLowerCase();
  const officeStatuses = new Set([
    "Office Draft",
    "For Office Head Review",
    "For VP Review (Office)",
    "For QA Approval (Office)",
  ]);
  const isOfficeFlow =
    workflowType === "office" || officeStatuses.has(localVersion.status);
  const ownerOfficeIdForFlow = (document as any)?.owner_office_id ?? null;

  const customFlowSteps =
    routeSteps.length > 0
      ? buildCustomFlowSteps({
          offices,
          ownerOfficeId: ownerOfficeIdForFlow,
          routeSteps,
        })
      : null;
  const activeFlowSteps =
    customFlowSteps ?? (isOfficeFlow ? flowStepsOffice : flowStepsQa);

  const currentStep = (() => {
    if (isCustomRouting && currentTask?.step) {
      const assignedId = currentTask?.assigned_office_id ?? null;
      if (
        (currentTask.step === "custom_office_review" ||
          currentTask.step === "custom_review_office") &&
        assignedId
      ) {
        const hit = activeFlowSteps.find(
          (s) => s.id === `custom_review_office:${Number(assignedId)}`,
        );
        if (hit) return hit;
      }
      if (
        (currentTask.step === "custom_office_approval" ||
          currentTask.step === "custom_approval_office") &&
        assignedId
      ) {
        const hit = activeFlowSteps.find(
          (s) => s.id === `custom_approval_office:${Number(assignedId)}`,
        );
        if (hit) return hit;
      }
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

  const assignedOfficeId = currentTask?.assigned_office_id ?? null;
  const canAct =
    !!assignedOfficeId && Number(myOfficeId) === Number(assignedOfficeId);
  const fullCode = document.code ?? "CODE-NOT-AVAILABLE";

  // ── Action labels + sorting ──────────────────────────────────
  const actionLabels: Record<string, string> = {
    QA_SEND_TO_OFFICE_REVIEW: "Send for review",
    QA_OFFICE_FORWARD_TO_VP: "Forward to VP",
    QA_OFFICE_RETURN_TO_QA: "Return to QA",
    QA_VP_SEND_BACK_TO_QA: "Send back to QA",
    QA_START_OFFICE_APPROVAL: "Start approval",
    QA_OFFICE_FORWARD_TO_VP_APPROVAL: "Forward to VP for approval",
    QA_VP_FORWARD_TO_PRESIDENT: "Forward to President",
    QA_PRESIDENT_SEND_BACK_TO_QA: "Send back to QA",
    QA_REGISTER: "Register document",
    QA_DISTRIBUTE: "Distribute document",
    OFFICE_SEND_TO_HEAD: "Send to Office Head",
    OFFICE_HEAD_FORWARD_TO_VP: "Forward to VP",
    OFFICE_HEAD_RETURN_TO_STAFF: "Return to staff",
    OFFICE_VP_SEND_BACK_TO_STAFF: "Send back to staff",
    OFFICE_SEND_TO_QA_APPROVAL: "Send to QA for approval",
    OFFICE_QA_RETURN_TO_STAFF: "Return to staff",
    OFFICE_QA_APPROVE: "Approve",
    OFFICE_REGISTER: "Register document",
    OFFICE_DISTRIBUTE: "Distribute document",
    CUSTOM_FORWARD: "Forward",
    CUSTOM_START_APPROVAL: "Start approval phase",
    CUSTOM_REGISTER: "Register document",
    CUSTOM_DISTRIBUTE: "Distribute document",
    REJECT: "Reject",
  };

  const actionPriority: Record<string, number> = {
    QA_SEND_TO_OFFICE_REVIEW: 10,
    QA_OFFICE_FORWARD_TO_VP: 20,
    QA_OFFICE_RETURN_TO_QA: 25,
    QA_VP_SEND_BACK_TO_QA: 30,
    QA_START_OFFICE_APPROVAL: 40,
    QA_OFFICE_FORWARD_TO_VP_APPROVAL: 50,
    QA_VP_FORWARD_TO_PRESIDENT: 60,
    QA_PRESIDENT_SEND_BACK_TO_QA: 70,
    QA_REGISTER: 80,
    QA_DISTRIBUTE: 90,
    OFFICE_SEND_TO_HEAD: 10,
    OFFICE_HEAD_FORWARD_TO_VP: 20,
    OFFICE_HEAD_RETURN_TO_STAFF: 25,
    OFFICE_VP_SEND_BACK_TO_STAFF: 30,
    OFFICE_SEND_TO_QA_APPROVAL: 40,
    OFFICE_QA_APPROVE: 50,
    OFFICE_QA_RETURN_TO_STAFF: 55,
    OFFICE_REGISTER: 60,
    OFFICE_DISTRIBUTE: 70,
    CUSTOM_FORWARD: 10,
    CUSTOM_START_APPROVAL: 20,
    CUSTOM_REGISTER: 30,
    CUSTOM_DISTRIBUTE: 40,
    REJECT: 999,
  };

  const headerActions: HeaderActionButton[] = React.useMemo(() => {
    return [...workflow.availableActions]
      .sort((a, b) => (actionPriority[a] ?? 500) - (actionPriority[b] ?? 500))
      .map((code) => ({
        key: code,
        label: actionLabels[code] ?? code,
        variant: code === "REJECT" ? "danger" : "primary",
        disabled: workflow.isChangingStatus || !canAct,
        onClick: async () => {
          let note: string | undefined;
          if (code === "REJECT") {
            // Note is handled by WorkflowActionBar modal — passed via onClick override
            // We call submitAction directly here; ActionBar handles note extraction
          }
          try {
            const res = await workflow.submitAction(code, note);
            if (res) {
              setLocalVersion((prev) => ({ ...prev, ...res.version }));
              push({
                type: "success",
                title: "Workflow updated",
                message: res.message || "Action completed.",
              });
              if (code === "REJECT") setActiveSideTab("comments");
            }
          } catch (e: any) {
            push({
              type: "error",
              title: "Action failed",
              message: e?.message ?? "Action failed.",
            });
          }
        },
      }));
  }, [
    workflow.availableActions,
    workflow.isChangingStatus,
    canAct,
    workflow.submitAction,
  ]);

  // Override REJECT to pass note from modal
  const headerActionsWithReject: HeaderActionButton[] = React.useMemo(() => {
    return headerActions.map((a) => {
      if (a.key !== "REJECT") return a;
      return {
        ...a,
        onClick: async (note?: string) => {
          try {
            const res = await workflow.submitAction("REJECT", note);
            if (res) {
              setLocalVersion((prev) => ({ ...prev, ...res.version }));
              push({
                type: "success",
                title: "Workflow updated",
                message: res.message || "Action completed.",
              });
              setActiveSideTab("comments");
            }
          } catch (e: any) {
            push({
              type: "error",
              title: "Action failed",
              message: e?.message ?? "Action failed.",
            });
          }
        },
      };
    });
  }, [headerActions]);

  // ── Version actions ──────────────────────────────────────────
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
              message: e?.message ?? "Download failed.",
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
            if (
              !confirm(
                "Delete this draft? This will remove the whole document draft.",
              )
            )
              return;
            await deleteDraftVersion(localVersion.id);
            onAfterActionClose?.();
          } catch (e: any) {
            push({
              type: "error",
              title: "Delete failed",
              message: e?.message ?? "Delete failed.",
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
            if (
              !confirm(
                "Cancel this revision draft? This will delete the draft and return to the last official version.",
              )
            )
              return;
            await deleteDraftVersion(localVersion.id);
            if (onChanged) await onChanged();
            onAfterActionClose?.();
          } catch (e: any) {
            push({
              type: "error",
              title: "Cancel failed",
              message: e?.message ?? "Cancel failed.",
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
    push,
    onChanged,
    onAfterActionClose,
  ]);

  // ── Header state signal ──────────────────────────────────────
  const onHeaderStateChangeRef = React.useRef(onHeaderStateChange);
  React.useEffect(() => {
    onHeaderStateChangeRef.current = onHeaderStateChange;
  }, [onHeaderStateChange]);

  const headerSig =
    `${localVersion.status}|${localVersion.version_number}|${canAct}|` +
    headerActionsWithReject
      .map((a) => `${a.key}:${a.disabled ? 1 : 0}`)
      .join(",") +
    "|" +
    versionActions.map((a) => `${a.key}:${a.disabled ? 1 : 0}`).join(",");

  const prevHeaderSig = React.useRef("");

  React.useEffect(() => {
    if (headerSig === prevHeaderSig.current) return;
    prevHeaderSig.current = headerSig;
    onHeaderStateChangeRef.current?.({
      title: localVersion.status === "Draft" ? localTitle : document.title,
      code: fullCode,
      status: localVersion.status,
      versionNumber: Number(localVersion.version_number),
      canAct,
      headerActions: headerActionsWithReject,
      versionActions,
    });
  }, [headerSig]);

  // ── Message sending ──────────────────────────────────────────
  const [draftMessage, setDraftMessage] = React.useState("");
  const [isSendingMessage, setIsSendingMessage] = React.useState(false);

  const handleSendMessage = async () => {
    const text = draftMessage.trim();
    if (!text) return;
    setIsSendingMessage(true);
    try {
      await postDocumentMessage(localVersion.id, {
        message: text,
        type: "comment",
      });
      setDraftMessage("");
      await workflow.refreshMessages();
    } catch (e: any) {
      push({
        type: "error",
        title: "Send failed",
        message: e?.message ?? "Failed to send.",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <section className="space-y-6">
      <WorkflowProgressCard
        phases={phases}
        routeStepsCount={routeSteps.length}
        isTasksReady={workflow.isTasksReady}
        currentStep={currentStep}
        nextStep={nextStep}
        currentPhaseIndex={currentPhaseIndex}
        currentGlobalIndex={currentGlobalIndex}
        currentPhaseId={currentPhase.id}
        activeFlowSteps={activeFlowSteps}
      />

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        {/* Left: task panel + comments/activity */}
        <div>
          <WorkflowInboxCard
            isTasksReady={workflow.isTasksReady}
            isBurstPolling={workflow.isBurstPolling}
            stopBurstPolling={workflow.stopBurstPolling}
            currentStep={currentStep}
            nextStep={nextStep}
            assignedOfficeId={assignedOfficeId}
            myOfficeId={myOfficeId}
            currentTask={currentTask}
            canAct={canAct}
            activeSideTab={activeSideTab}
            setActiveSideTab={setActiveSideTab}
            isLoadingActivityLogs={workflow.isLoadingActivityLogs}
            activityLogs={workflow.activityLogs}
            isLoadingMessages={workflow.isLoadingMessages}
            messages={workflow.messages}
            draftMessage={draftMessage}
            setDraftMessage={setDraftMessage}
            isSendingMessage={isSendingMessage}
            onSendMessage={handleSendMessage}
            formatWhen={formatWhen}
          />
        </div>

        {/* Right: preview */}
        <DocumentPreviewPanel
          versionId={localVersion.id}
          previewPath={localVersion.preview_path ?? null}
          filePath={localVersion.file_path ?? null}
          originalFilename={localVersion.original_filename ?? null}
          status={localVersion.status}
          signedPreviewUrl={signedPreviewUrl}
          previewNonce={previewNonce}
          isUploading={fileUpload.isUploading}
          uploadProgress={fileUpload.uploadProgress}
          isPreviewLoading={isPreviewLoading}
          setIsPreviewLoading={setIsPreviewLoading}
          fileInputRef={fileUpload.fileInputRef}
          onOpenPreview={async () => {
            const res = await getDocumentPreviewLink(localVersion.id);
            window.open(res.url, "_blank");
          }}
          onClickReplace={fileUpload.triggerFilePicker}
          onDrop={fileUpload.handleDrop}
          onDragOver={fileUpload.handleDragOver}
          onDragLeave={fileUpload.handleDragLeave}
          onFileSelect={fileUpload.handleFileSelect}
        />
      </div>
    </section>
  );
};

export default DocumentFlow;
