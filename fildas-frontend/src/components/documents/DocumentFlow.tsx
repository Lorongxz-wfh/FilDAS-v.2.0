import React from "react";
import UploadProgress from "../ui/loader/UploadProgress";
import InlineSpinner from "../ui/loader/InlineSpinner";
import Skeleton from "../ui/loader/Skeleton";
import type {
  Document,
  DocumentVersion,
  WorkflowTask,
  DocumentMessage,
  WorkflowActionCode,
  Office,
} from "../../services/documents";

import { getCurrentUserOfficeId } from "../../services/documents";

import { useToast } from "../ui/toast/ToastContext";

import {
  listOffices,
  getDocumentPreviewLink,
  // getDocumentVersion, // removed (avoid refetching version details here)
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

import { getAuthUser } from "../../lib/auth"; // adjust path if needed

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

const flowStepsQa: FlowStep[] = [
  // Review
  {
    id: "draft",
    label: "Drafted by QA",
    statusValue: "Draft",
    phase: "review",
  },
  {
    id: "office_review",
    label: "Office review",
    statusValue: "For Office Review",
    phase: "review",
  },
  {
    id: "vp_review",
    label: "VP review",
    statusValue: "For VP Review",
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
    id: "office_approval",
    label: "Office approval",
    statusValue: "For Office Approval",
    phase: "approval",
  },
  {
    id: "vp_approval",
    label: "VP approval",
    statusValue: "For VP Approval",
    phase: "approval",
  },
  {
    id: "pres_approval",
    label: "President approval",
    statusValue: "For President Approval",
    phase: "approval",
  },

  // Registration / Distribution
  {
    id: "qa_registration",
    label: "QA registration",
    statusValue: "For QA Registration",
    phase: "registration",
  },
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

const flowStepsOffice: FlowStep[] = [
  // Review (Office-start)
  {
    id: "office_draft",
    label: "Office draft",
    statusValue: "Office Draft",
    phase: "review",
  },
  {
    id: "office_head_review",
    label: "Office head review",
    statusValue: "For Office Head Review",
    phase: "review",
  },
  {
    id: "vp_review_office",
    label: "VP review",
    statusValue: "For VP Review (Office)",
    phase: "review",
  },
  {
    id: "qa_approval_office",
    label: "QA approval",
    statusValue: "For QA Approval (Office)",
    phase: "review",
  },

  // Approval (Office-start, optional but you already created backend statuses)
  {
    id: "office_approval_office",
    label: "Office approval",
    statusValue: "For Office Approval (Office)",
    phase: "approval",
  },
  {
    id: "vp_approval_office",
    label: "VP approval",
    statusValue: "For VP Approval (Office)",
    phase: "approval",
  },
  {
    id: "pres_approval_office",
    label: "President approval",
    statusValue: "For President Approval (Office)",
    phase: "approval",
  },

  // Registration / Distribution
  {
    id: "qa_registration_office",
    label: "QA registration",
    statusValue: "For QA Registration (Office)",
    phase: "registration",
  },
  {
    id: "qa_distribution_office",
    label: "QA distribution",
    statusValue: "For QA Distribution (Office)",
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

function toWorkflowAction(toStatus: string): WorkflowActionCode | null {
  switch (toStatus) {
    case "For Office Review":
      return "SEND_TO_OFFICE_REVIEW";

    case "For Office Head Review":
      return "FORWARD_TO_OFFICE_HEAD_REVIEW";

    case "For VP Review":
    case "For VP Review (Office)":
      return "FORWARD_TO_VP_REVIEW";

    case "For QA Final Check":
      return "VP_SEND_BACK_TO_QA_FINAL_CHECK";

    case "For QA Approval (Office)":
      return "VP_FORWARD_TO_QA_APPROVAL";

    case "For Office Approval":
    case "For Office Approval (Office)":
      return "START_OFFICE_APPROVAL";

    case "For VP Approval":
    case "For VP Approval (Office)":
      return "FORWARD_TO_VP_APPROVAL";

    case "For President Approval":
    case "For President Approval (Office)":
      return "FORWARD_TO_PRESIDENT_APPROVAL";

    case "For QA Registration":
    case "For QA Registration (Office)":
      return "FORWARD_TO_QA_REGISTRATION";

    case "For QA Distribution":
    case "For QA Distribution (Office)":
      return "FORWARD_TO_QA_DISTRIBUTION";

    case "Distributed":
      return "MARK_DISTRIBUTED";

    case "QA_EDIT":
      return "RETURN_TO_QA_EDIT";

    case "OFFICE_EDIT":
      return "RETURN_TO_OFFICE_EDIT";

    default:
      return null;
  }
}

const transitionsQa: Record<string, TransitionAction[]> = {
  // Review phase
  Draft: [
    // ✅ Explicit Draft
    {
      toStatus: "For Office Review",
      label: "Send to Office for review",
    },
  ],

  "For Office Review": [
    {
      toStatus: "For VP Review",
      label: "Forward to VP for review",
    },
    {
      toStatus: "QA_EDIT",
      label: "Return to QA (edit)",
    },
  ],
  "For VP Review": [
    {
      toStatus: "For QA Final Check",
      label: "Send back to QA for final check",
    },
    { toStatus: "QA_EDIT", label: "Return to QA edit" },
  ],

  "For QA Final Check": [
    {
      toStatus: "For Office Approval",
      label: "Start approval phase (Office approval)",
    },
    { toStatus: "QA_EDIT", label: "Return to QA edit" },
  ],

  // Approval phase
  "For Office Approval": [
    {
      toStatus: "For VP Approval",
      label: "Forward to VP for approval",
    },
    {
      toStatus: "QA_EDIT",
      label: "Return to QA (edit)",
    },
  ],
  "For VP Approval": [
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
      toStatus: "For QA Registration",
      label: "Forward to QA for registration",
    },
    {
      toStatus: "QA_EDIT",
      label: "Return to QA (edit)",
    },
  ],

  "For QA Registration": [
    {
      toStatus: "For QA Distribution",
      label: "Proceed to QA distribution",
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

const transitionsOffice: Record<string, TransitionAction[]> = {
  "Office Draft": [
    {
      toStatus: "For Office Head Review",
      label: "Send to Office head for review",
    },
  ],

  "For Office Head Review": [
    { toStatus: "For VP Review (Office)", label: "Forward to VP for review" },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],

  "For VP Review (Office)": [
    {
      toStatus: "For QA Approval (Office)",
      label: "Forward to QA for approval",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],

  "For QA Approval (Office)": [
    {
      toStatus: "Distributed",
      label: "Approve and distribute (finish)",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],

  "For Office Approval (Office)": [
    {
      toStatus: "For VP Approval (Office)",
      label: "Forward to VP for approval",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],

  "For VP Approval (Office)": [
    {
      toStatus: "For President Approval (Office)",
      label: "Forward to President for approval",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],

  "For President Approval (Office)": [
    {
      toStatus: "For QA Registration (Office)",
      label: "Forward to QA for registration",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],

  "For QA Registration (Office)": [
    {
      toStatus: "For QA Distribution (Office)",
      label: "Proceed to QA distribution",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],

  "For QA Distribution (Office)": [
    { toStatus: "Distributed", label: "Mark as distributed" },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],

  Distributed: [],
};

function officeIdByCode(
  offices: Office[] | null | undefined,
  code: string,
): number | null {
  if (!offices?.length) return null;
  const target = String(code || "").toUpperCase();
  return (
    offices.find((o) => String(o.code || "").toUpperCase() === target)?.id ??
    null
  );
}

function resolveVpCodeForOfficeCode(
  ownerCode: string | null | undefined,
): string | null {
  if (!ownerCode) return null;

  // President cluster (temporary): route straight to President
  const presidentCodes = new Set(["PO", "HR", "SA", "CH", "AA"]);
  if (presidentCodes.has(ownerCode)) return "PO";

  const vpadCodes = new Set([
    "VAd",
    "PC",
    "MD",
    "SO",
    "SP",
    "SC",
    "SH",
    "BG",
    "M",
    "WP",
    "IT",
  ]);
  if (vpadCodes.has(ownerCode)) return "VAd";

  const vpfCodes = new Set(["VF", "AO", "BO", "BM", "CO", "PR", "UE"]);
  if (vpfCodes.has(ownerCode)) return "VF";

  const vprCodes = new Set(["VR", "RC", "CX", "QA", "IP"]);
  if (vprCodes.has(ownerCode)) return "VR";

  const vpCodes = new Set([
    "VA",
    "CN",
    "CB",
    "CT",
    "HS",
    "ES",
    "PS",
    "GS",
    "AS",
    "TM",
    "CS",
    "JE",
    "CE",
    "AR",
    "GC",
    "UL",
    "NS",
  ]);
  if (vpCodes.has(ownerCode)) return "VA";

  // fallback
  return "VA";
}

function expectedActorOfficeId(
  fromStatus: string,
  ownerOfficeId: number | null | undefined,
  reviewOfficeId: number | null | undefined,
  ownerOfficeCode: string | null | undefined,
  offices: Office[] | null | undefined,
): number | null {
  switch (fromStatus) {
    // QA acts
    case "Draft":
    case "For QA Final Check":
    case "For QA Registration":
    case "For QA Distribution":
      return officeIdByCode(offices, "QA");

    // Office acts: use QA-selected review office if present, else fallback to owner office
    case "For Office Review":
    case "For Office Approval":
      return reviewOfficeId ?? ownerOfficeId ?? null;

    // VP acts (VP for that owner office)
    case "For VP Review":
    case "For VP Approval": {
      const vpCode = resolveVpCodeForOfficeCode(ownerOfficeCode);
      return vpCode ? officeIdByCode(offices, vpCode) : null;
    }

    // President acts
    case "For President Approval":
      return officeIdByCode(offices, "PO");

    default:
      return null;
  }
}

function findCurrentStep(status: string, steps: FlowStep[]): FlowStep {
  const found = steps.find((s) => s.statusValue === status);
  return found ?? steps[0];
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
  const [isSavingDesc, setIsSavingDesc] = React.useState(false);

  // Effective date (stored as YYYY-MM-DD)
  const [localEffectiveDate, setLocalEffectiveDate] = React.useState<string>(
    String((version as any)?.effective_date ?? "").slice(0, 10),
  );
  const [initialEffectiveDate, setInitialEffectiveDate] =
    React.useState<string>(
      String((version as any)?.effective_date ?? "").slice(0, 10),
    );
  const [isSavingEffectiveDate, setIsSavingEffectiveDate] =
    React.useState(false);

  const [offices, setOffices] = React.useState<Office[]>([]);

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

  function isQAUser(): boolean {
    const u: any = getAuthUser?.();
    const roleName = String(u?.role?.name ?? "").toLowerCase();
    const officeCode = String(u?.office?.code ?? "").toUpperCase();
    return roleName === "qa" || officeCode === "QA";
  }

  const onHeaderStateChangeRef = React.useRef(onHeaderStateChange);

  React.useEffect(() => {
    onHeaderStateChangeRef.current = onHeaderStateChange;
  }, [onHeaderStateChange]);

  const [isUploading, setIsUploading] = React.useState(false);
  const [isSavingTitle, setIsSavingTitle] = React.useState(false);
  const [tasks, setTasks] = React.useState<WorkflowTask[]>([]);
  const [isTasksReady, setIsTasksReady] = React.useState(false);
  const [messages, setMessages] = React.useState<DocumentMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [activityLogs, setActivityLogs] = React.useState<ActivityLogItem[]>([]);
  const [isLoadingActivityLogs, setIsLoadingActivityLogs] =
    React.useState(false);

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

  const refreshAll = React.useCallback(async () => {
    // Do not refetch version here—parent already owns version fetch/selection.
    const nextTasks = await listWorkflowTasks(localVersion.id);
    setTasks(nextTasks);

    if (activeSideTab === "comments") {
      const nextMsgs = await listDocumentMessages(localVersion.id);
      setMessages(nextMsgs);
    }

    if (activeSideTab === "logs") {
      const page = await listActivityLogs({
        scope: "document",
        document_version_id: localVersion.id,
        per_page: 50,
      });
      setActivityLogs(page.data);
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
      setIsSavingDesc(true);
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
      } finally {
        setIsSavingDesc(false);
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

  React.useEffect(() => {
    if (!canEditEffectiveDate) return;

    if (localEffectiveDate === initialEffectiveDate) return;

    if (effectiveDateSaveTimerRef.current)
      window.clearTimeout(effectiveDateSaveTimerRef.current);

    effectiveDateSaveTimerRef.current = window.setTimeout(async () => {
      try {
        setIsSavingEffectiveDate(true);

        const updated = await updateDocumentVersionEffectiveDate(
          localVersion.id,
          localEffectiveDate.trim() ? localEffectiveDate.trim() : null,
        );

        setLocalVersion((prev) => ({ ...prev, ...updated }));
        setInitialEffectiveDate(localEffectiveDate);
        if (onChanged) await onChanged();
      } catch (e) {
        console.error("Auto-save effective date failed", e);
      } finally {
        setIsSavingEffectiveDate(false);
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

  const isOfficeFlow =
    workflowType === "office" || officeStatuses.has(localVersion.status);

  const activeFlowSteps = isOfficeFlow ? flowStepsOffice : flowStepsQa;
  const activeTransitions = isOfficeFlow ? transitionsOffice : transitionsQa;

  const currentStep = findCurrentStep(localVersion.status, activeFlowSteps);
  const currentPhase =
    phases.find((p) => p.id === currentStep.phase) ?? phases[0];
  const currentPhaseIndex = phaseOrder(currentPhase.id);
  const currentGlobalIndex = activeFlowSteps.findIndex(
    (s) => s.id === currentStep.id,
  );
  const nextStep =
    currentGlobalIndex >= 0
      ? (activeFlowSteps[currentGlobalIndex + 1] ?? null)
      : null;

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

  const ownerOfficeCode =
    (document as any)?.owner_office?.code ??
    (document as any)?.office?.code ??
    null;

  // Can I act? Only if my office is the one assigned on the open task.
  const canAct = !!assignedOfficeId && myOfficeId === assignedOfficeId;

  // Build actions for the current status.
  const availableActions = activeTransitions[localVersion.status] ?? [];

  const fullCode = document.code ?? "CODE-NOT-AVAILABLE";

  const headerActions: HeaderActionButton[] = availableActions.map((action) => {
    const isDanger =
      action.toStatus === "QA_EDIT" || action.toStatus === "OFFICE_EDIT";

    return {
      key: action.toStatus,
      label: action.label,
      variant: isDanger ? "danger" : "primary",

      disabled: isChangingStatus || !canAct,
      onClick: async () => {
        const code = toWorkflowAction(action.toStatus);
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
          action.toStatus === "QA_EDIT" ||
          action.toStatus === "OFFICE_EDIT"
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
          if (code === "SEND_TO_OFFICE_REVIEW") {
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

          if (action.toStatus === "QA_EDIT") {
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
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Workflow progress
            </p>
            {!isTasksReady ? (
              <Skeleton className="mt-1 h-5 w-52" />
            ) : (
              <p className="mt-1 text-sm font-medium text-slate-900">
                {currentPhase.label}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-[11px] text-slate-500">Current step</p>
            {!isTasksReady ? (
              <Skeleton className="mt-1 h-4 w-28 ml-auto" />
            ) : (
              <p className="mt-0.5 text-xs font-semibold text-slate-900">
                {currentStep.label}
              </p>
            )}
          </div>
        </div>

        {/* Phase rail */}
        <div className="mt-4 grid grid-cols-3 gap-3">
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
                  <div className="flex items-center gap-2">
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
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "text-sky-800"
                          : isCompleted
                            ? "text-slate-700"
                            : "text-slate-500"
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      isCurrent
                        ? "bg-sky-100 text-sky-700"
                        : isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isCurrent ? "Current" : isCompleted ? "Done" : "Next"}
                  </span>
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

          <div className="mt-4 flex items-center gap-3">
            {activeFlowSteps
              .filter((s) => s.phase === currentPhase.id)
              .map((step, index, arr) => {
                const stepIndex = activeFlowSteps.findIndex(
                  (s) => s.id === step.id,
                );
                const isCurrent = step.id === currentStep.id;
                const isCompleted =
                  currentGlobalIndex >= 0 &&
                  stepIndex >= 0 &&
                  stepIndex < currentGlobalIndex;

                return (
                  <React.Fragment key={step.id}>
                    <div className="min-w-0 flex flex-col items-center">
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
                        className={`mt-2 max-w-[140px] truncate text-center text-[11px] font-medium ${
                          isCurrent
                            ? "text-sky-800"
                            : isCompleted
                              ? "text-slate-700"
                              : "text-slate-500"
                        }`}
                        title={step.label}
                      >
                        {step.label}
                      </span>
                    </div>

                    {index < arr.length - 1 && (
                      <div className="flex-1 px-1">
                        <div
                          className={`h-1 rounded-full ${
                            isCompleted
                              ? "bg-emerald-400"
                              : isCurrent
                                ? "bg-sky-300"
                                : "bg-slate-200"
                          }`}
                        />
                      </div>
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

                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Description (locked after Draft)
                    </p>
                    {isSavingDesc && (
                      <span className="text-slate-400">
                        <InlineSpinner />
                      </span>
                    )}
                  </div>

                  <textarea
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    rows={3}
                    value={localDesc}
                    onChange={(e) => setLocalDesc(e.target.value)}
                    placeholder="Enter description…"
                  />
                </div>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                  {document.title}
                </h1>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {fullCode}
                </p>

                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </p>
                  <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
                    {localVersion.description?.trim()
                      ? localVersion.description
                      : "—"}
                  </p>
                </div>
              </>
            )}

            {/* Metadata row */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div>
                <span className="font-medium text-slate-600">Version:</span> v
                {localVersion.version_number}
              </div>

              <div>
                <span className="font-medium text-slate-600">
                  Effective date:
                </span>{" "}
                {canEditEffectiveDate ? (
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="date"
                      value={localEffectiveDate}
                      onChange={(e) => setLocalEffectiveDate(e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800"
                    />
                    {isSavingEffectiveDate && (
                      <span className="text-slate-400">
                        <InlineSpinner />
                      </span>
                    )}
                  </span>
                ) : (
                  <span>
                    {(localVersion as any)?.effective_date
                      ? formatWhen((localVersion as any).effective_date)
                      : "—"}
                  </span>
                )}
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

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Workflow inbox
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {isTasksReady ? currentStep.label : "Loading step…"}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {nextStep ? `Next: ${nextStep.label}` : "No next step"}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    !isTasksReady
                      ? "bg-slate-100 text-slate-500"
                      : canAct
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
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
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                  >
                    Stop live updates
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
              {!isTasksReady ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-slate-600">
                    Assigned:{" "}
                    <span className="font-medium text-slate-800">
                      {assignedOfficeId ?? "-"}
                    </span>
                    {"  "}•{"  "}
                    You:{" "}
                    <span className="font-medium text-slate-800">
                      {myOfficeId ?? "-"}
                    </span>
                  </p>

                  {!currentTask && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      No open workflow task found for this version.
                    </p>
                  )}

                  {currentTask && !canAct && (
                    <p className="mt-1 text-[11px] text-slate-600">
                      You can view this document, but only the assigned office
                      can perform workflow actions.
                    </p>
                  )}
                </>
              )}
            </div>

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
                  Activity
                </button>
              </div>

              {activeSideTab === "logs" ? (
                <div className="mt-3 space-y-2">
                  {isLoadingActivityLogs ? (
                    <div className="h-44 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <p className="text-xs text-slate-500">No activity yet.</p>
                  ) : (
                    <div className="h-44 overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                      {activityLogs.map((l) => (
                        <div
                          key={l.id}
                          className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
                        >
                          <p className="text-xs text-slate-700">
                            <span className="font-semibold">{l.event}</span>
                            {l.label ? ` — ${l.label}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {l.created_at
                              ? `When: ${formatWhen(l.created_at)}`
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
                    <div className="h-44 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-slate-500">No comments yet.</p>
                  ) : (
                    <div className="h-44 overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
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
            disabled={!localVersion.preview_path}
            onClick={async () => {
              try {
                const res = await getDocumentPreviewLink(localVersion.id);
                window.open(res.url, "_blank");
              } catch (e: any) {
                alert(e.message || "Failed to open preview");
              }
            }}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ml-2 ${
              !localVersion.preview_path
                ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Open preview
          </button>

          <div
            className={`relative h-[600px] w-full overflow-hidden rounded-xl border-2 transition-all ${
              localVersion.file_path
                ? "border-slate-200 bg-white cursor-pointer hover:border-sky-300 hover:shadow-md"
                : "border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-sky-400 hover:bg-sky-50"
            }`}
            onClick={() => {
              if (isUploading) return;
              if (localVersion.status !== "Draft") return;
              fileInputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {localVersion.file_path &&
              localVersion.preview_path &&
              !signedPreviewUrl && (
                <div className="absolute inset-0 p-4">
                  <Skeleton className="h-full w-full rounded-lg" />
                </div>
              )}

            {localVersion.file_path && localVersion.preview_path ? (
              <iframe
                key={`${localVersion.id}-${previewNonce}`}
                src={signedPreviewUrl || "about:blank"}
                title="Document preview"
                className="h-full w-full"
                onLoad={() => setIsPreviewLoading(false)}
                onError={() => setIsPreviewLoading(false)}
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
