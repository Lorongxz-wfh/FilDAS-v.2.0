import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame.tsx";
import Button from "../components/ui/Button.tsx";
import { getAuthUser } from "../lib/auth.ts";
import {
  getDocumentRequest,
  getDocumentRequestExamplePreviewLink,
  getDocumentRequestMessages,
  getDocumentRequestSubmissionFileDownloadLink,
  getDocumentRequestSubmissionFilePreviewLink,
  postDocumentRequestMessage,
  reviewDocumentRequestSubmission,
  submitDocumentRequestEvidence,
  type DocumentRequestMessageRow,
} from "../services/documentRequests";
import {
  FileText,
  MessageSquare,
  Activity,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  Send,
  RefreshCw,
  Download,
} from "lucide-react";

function roleLower(me: any) {
  const raw = typeof me?.role === "string" ? me?.role : me?.role?.name;
  return String(raw ?? "").toLowerCase();
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase();
  const map: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    closed:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-surface-400 dark:text-slate-400 dark:border-surface-300",
    cancelled:
      "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    pending:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    submitted:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
    accepted:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    rejected:
      "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  };
  const cls = map[s] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${cls}`}
    >
      {String(status).toUpperCase()}
    </span>
  );
}

function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return null;
  const r = String(role).toUpperCase();
  const map: Record<string, string> = {
    QA: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    SYSADMIN:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    ADMIN:
      "bg-slate-100 text-slate-600 dark:bg-surface-400 dark:text-slate-400",
    OFFICE_STAFF:
      "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
    OFFICE_HEAD:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  };
  const cls = map[r] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
      {r}
    </span>
  );
}

function PreviewModal({
  url,
  filename,
  onClose,
}: {
  url: string;
  filename?: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden bg-white shadow-2xl dark:bg-surface-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal toolbar */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-surface-400 dark:bg-surface-600">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[70%]">
            {filename ?? "Preview"}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={filename}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition dark:border-surface-400 dark:bg-surface-500 dark:text-slate-300"
            >
              <Download size={12} /> Download
            </a>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition dark:hover:bg-surface-400 dark:hover:text-slate-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* iframe */}
        <iframe
          title="Full preview"
          src={url}
          className="flex-1 min-h-0 w-full bg-white dark:bg-surface-600"
        />
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
}: {
  msg: DocumentRequestMessageRow;
  isMine: boolean;
}) {
  return (
    <div className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {msg.sender.profile_photo_path ? (
          <img
            src={msg.sender.profile_photo_path}
            alt={msg.sender.name}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-surface-400 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {msg.sender.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div
        className={`flex flex-col gap-1 max-w-[75%] ${isMine ? "items-end" : "items-start"}`}
      >
        <div
          className={`flex items-center gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}
        >
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {msg.sender.name}
          </span>
          <RoleBadge role={msg.sender.role} />
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isMine
              ? "bg-sky-600 text-white rounded-tr-sm"
              : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm dark:bg-surface-400 dark:border-surface-300 dark:text-slate-200"
          }`}
        >
          {msg.message}
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {formatDateTime(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

export default function DocumentRequestPage() {
  const navigate = useNavigate();
  const params = useParams();
  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  const requestId = Number(params.id);
  if (!Number.isFinite(requestId) || requestId <= 0)
    return <Navigate to="/dashboard" replace />;

  const role = roleLower(me);
  const isQa = role === "qa" || role === "sysadmin" || role === "admin";
  const myUserId = Number(me?.id ?? 0);

  // ── Core data ──────────────────────────────────────────────────────────
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [req, setReq] = React.useState<any | null>(null);
  const [recipient, setRecipient] = React.useState<any | null>(null);
  const [submissions, setSubmissions] = React.useState<any[]>([]);
  const [latestSubmission, setLatestSubmission] = React.useState<any | null>(
    null,
  );
  const [forceSelectLatestOnce, setForceSelectLatestOnce] =
    React.useState(false);

  // ── Selected submission ────────────────────────────────────────────────
  const [selectedSubmissionId, setSelectedSubmissionId] = React.useState<
    number | null
  >(null);
  const selectedSubmission = React.useMemo(() => {
    if (!selectedSubmissionId) return latestSubmission;
    return (
      submissions.find((s) => Number(s.id) === Number(selectedSubmissionId)) ??
      latestSubmission
    );
  }, [selectedSubmissionId, submissions, latestSubmission]);

  // ── Tabs ───────────────────────────────────────────────────────────────
  const [leftTab, setLeftTab] = React.useState<"comments" | "activity">(
    "comments",
  );
  const [rightTab, setRightTab] = React.useState<"example" | "submission">(
    "example",
  );

  // ── Comments ───────────────────────────────────────────────────────────
  const [messages, setMessages] = React.useState<DocumentRequestMessageRow[]>(
    [],
  );
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [postErr, setPostErr] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // ── Activity ───────────────────────────────────────────────────────────
  const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
  const [activityLoading, setActivityLoading] = React.useState(false);

  // ── Preview: example ──────────────────────────────────────────────────
  const [examplePreviewUrl, setExamplePreviewUrl] = React.useState("");
  const [examplePreviewLoading, setExamplePreviewLoading] =
    React.useState(false);
  const [examplePreviewError, setExamplePreviewError] = React.useState<
    string | null
  >(null);

  // ── Preview: submission ───────────────────────────────────────────────
  const [submissionPreviewUrl, setSubmissionPreviewUrl] = React.useState("");
  const [submissionPreviewLoading, setSubmissionPreviewLoading] =
    React.useState(false);
  const [submissionPreviewError, setSubmissionPreviewError] = React.useState<
    string | null
  >(null);

  // ── Local file upload ──────────────────────────────────────────────────
  const [files, setFiles] = React.useState<File[]>([]);
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMsg, setSubmitMsg] = React.useState<string | null>(null);
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);

  // ── Preview modal ──────────────────────────────────────────────────────
  const [previewModal, setPreviewModal] = React.useState<{
    url: string;
    filename?: string;
  } | null>(null);

  // ── QA review ─────────────────────────────────────────────────────────
  const [qaNote, setQaNote] = React.useState("");
  const [reviewing, setReviewing] = React.useState(false);
  const [reviewErr, setReviewErr] = React.useState<string | null>(null);
  const [reviewMsg, setReviewMsg] = React.useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────
  const selectedFileId = React.useMemo(() => {
    const f0 = selectedSubmission?.files?.[0];
    return f0?.id ? Number(f0.id) : null;
  }, [selectedSubmission]);

  const canSubmit = !isQa && req?.status === "open" && !!recipient?.id;
  const latestStatus = String(latestSubmission?.status ?? "");
  const hasLocalFile = files.length === 1 && !!localPreviewUrl;
  const showUploadArea =
    canSubmit &&
    (latestStatus === "rejected" || !latestSubmission) &&
    !hasLocalFile;
  const showLockNotice =
    canSubmit &&
    (latestStatus === "submitted" || latestStatus === "accepted") &&
    !hasLocalFile;
  const canQaReview =
    isQa &&
    !!selectedSubmission?.id &&
    String(selectedSubmission?.status) === "submitted";

  // ── Load core data ─────────────────────────────────────────────────────
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocumentRequest(requestId);
      setReq(data.request);
      setRecipient((data as any).recipient ?? null);
      const latest = (data as any).latest_submission ?? null;
      const hist = Array.isArray((data as any).submissions)
        ? (data as any).submissions
        : [];
      setLatestSubmission(latest);
      setSubmissions(hist);
      setSelectedSubmissionId((prev) => {
        if (forceSelectLatestOnce) return latest?.id ? Number(latest.id) : null;
        if (prev) return prev;
        return latest?.id ? Number(latest.id) : null;
      });
      if (forceSelectLatestOnce) setForceSelectLatestOnce(false);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to load request.",
      );
    } finally {
      setLoading(false);
    }
  }, [requestId, forceSelectLatestOnce]);

  React.useEffect(() => {
    load().catch(() => {});
  }, [load]);

  // ── Load messages ──────────────────────────────────────────────────────
  const loadMessages = React.useCallback(async () => {
    setMessagesLoading(true);
    try {
      const data = await getDocumentRequestMessages(requestId);
      setMessages(data);
    } catch {
      // silently fail — not critical
    } finally {
      setMessagesLoading(false);
    }
  }, [requestId]);

  React.useEffect(() => {
    loadMessages().catch(() => {});
  }, [loadMessages]);

  // Auto-scroll to bottom when messages load
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load activity ──────────────────────────────────────────────────────
  const loadActivity = React.useCallback(async () => {
    if (leftTab !== "activity") return;
    setActivityLoading(true);
    try {
      const { default: api } = await import("../services/api");
      const res = await api.get("/activity", {
        params: { scope: "request", document_id: requestId, per_page: 50 },
      });
      setActivityLogs(res.data?.data ?? []);
    } catch {
      setActivityLogs([]);
    } finally {
      setActivityLoading(false);
    }
  }, [requestId, leftTab]);

  React.useEffect(() => {
    loadActivity().catch(() => {});
  }, [loadActivity]);

  // ── Load example preview ───────────────────────────────────────────────
  const loadExamplePreview = React.useCallback(async () => {
    if (!req?.example_preview_path) {
      setExamplePreviewUrl("");
      return;
    }
    setExamplePreviewLoading(true);
    setExamplePreviewError(null);
    try {
      const res = await getDocumentRequestExamplePreviewLink(requestId);
      setExamplePreviewUrl(res.url);
    } catch (e: any) {
      setExamplePreviewError(
        e?.response?.data?.message ?? e?.message ?? "Failed to load preview.",
      );
    } finally {
      setExamplePreviewLoading(false);
    }
  }, [req?.example_preview_path, requestId]);

  React.useEffect(() => {
    loadExamplePreview().catch(() => {});
  }, [loadExamplePreview]);

  // ── Load submission preview ────────────────────────────────────────────
  React.useEffect(() => {
    if (!selectedFileId) {
      setSubmissionPreviewUrl("");
      return;
    }
    setSubmissionPreviewLoading(true);
    setSubmissionPreviewError(null);
    getDocumentRequestSubmissionFilePreviewLink(selectedFileId)
      .then((r) => setSubmissionPreviewUrl(r.url))
      .catch((e: any) =>
        setSubmissionPreviewError(
          e?.response?.data?.message ?? "Failed to load preview.",
        ),
      )
      .finally(() => setSubmissionPreviewLoading(false));
  }, [selectedFileId]);

  // ── Local file preview ─────────────────────────────────────────────────
  React.useEffect(() => {
    let url: string | null = null;
    if (files.length === 1) {
      url = URL.createObjectURL(files[0]);
      setLocalPreviewUrl(url);
    } else setLocalPreviewUrl("");
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [files]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSelectFiles = (picked: FileList | null) => {
    setSubmitMsg(null);
    setSubmitErr(null);
    const arr = picked ? Array.from(picked) : [];
    if (!arr.length) {
      setFiles([]);
      return;
    }
    if (arr.length > 1) {
      setFiles([]);
      setSubmitErr("Please upload only 1 file.");
      return;
    }
    if (arr[0].size > 10 * 1024 * 1024) {
      setFiles([]);
      setSubmitErr("File too large (max 10MB).");
      return;
    }
    setFiles(arr);
  };

  const postComment = async () => {
    const text = commentText.trim();
    if (!text || posting) return;
    setPosting(true);
    setPostErr(null);
    try {
      const msg = await postDocumentRequestMessage(requestId, text);
      setMessages((prev) => [...prev, msg]);
      setCommentText("");
    } catch (e: any) {
      setPostErr(e?.response?.data?.message ?? e?.message ?? "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitMsg(null);
    setSubmitErr(null);
    try {
      if (!recipient?.id) {
        setSubmitErr("Recipient record missing.");
        return;
      }
      if (!canSubmit) {
        setSubmitErr("Request is not open.");
        return;
      }
      if (!files.length) {
        setSubmitErr("Please attach a file.");
        return;
      }
      await submitDocumentRequestEvidence({
        request_id: requestId,
        recipient_id: Number(recipient.id),
        note: note.trim() || null,
        files,
      });
      setSubmitMsg("Submitted successfully.");
      setNote("");
      setFiles([]);
      setForceSelectLatestOnce(true);
      await load();
    } catch (e: any) {
      setSubmitErr(
        e?.response?.data?.message ?? e?.message ?? "Submit failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const qaReview = async (decision: "accepted" | "rejected") => {
    setReviewing(true);
    setReviewErr(null);
    setReviewMsg(null);
    try {
      if (!selectedSubmission?.id) {
        setReviewErr("No submission selected.");
        return;
      }
      await reviewDocumentRequestSubmission({
        submission_id: Number(selectedSubmission.id),
        decision,
        note: qaNote.trim() || null,
      });
      setReviewMsg(
        decision === "accepted"
          ? "Submission accepted."
          : "Submission rejected.",
      );
      setQaNote("");
      await load();
    } catch (e: any) {
      setReviewErr(
        e?.response?.data?.message ?? e?.message ?? "Review failed.",
      );
    } finally {
      setReviewing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading && !req) {
    return (
      <PageFrame
        title="Document Request"
        onBack={() => navigate("/document-requests")}
      >
        <div className="flex h-60 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Loading request…
            </span>
          </div>
        </div>
      </PageFrame>
    );
  }

  if (error) {
    return (
      <PageFrame
        title="Document Request"
        onBack={() => navigate("/document-requests")}
      >
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
          {error}
        </div>
      </PageFrame>
    );
  }

  if (!req) return null;

  return (
    <PageFrame
      title={req.title ?? `Request #${requestId}`}
      onBack={() => navigate("/document-requests")}
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ── LEFT PANE ─────────────────────────────────────────────── */}
        <section className="lg:col-span-7 min-w-0 flex flex-col gap-5">
          {/* Header card */}
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-surface-400 dark:bg-surface-500">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  #{requestId}
                </span>
                <StatusBadge status={req.status} />
              </div>
              {req.example_original_filename && (
                <div className="flex items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] text-slate-500 dark:border-surface-400 dark:bg-surface-600 dark:text-slate-400">
                  <FileText size={11} />
                  <span className="truncate max-w-48">
                    {req.example_original_filename}
                  </span>
                </div>
              )}
            </div>

            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {req.title}
            </h1>

            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 dark:border-surface-400">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Due Date
                </dt>
                <dd className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Clock size={12} className="text-slate-400" />
                  {formatDate(req.due_at)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Office
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {req.office_name ?? "—"}
                  {req.office_code && (
                    <span className="ml-1 text-[10px] text-slate-400">
                      ({req.office_code})
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Submission
                </dt>
                <dd className="mt-1">
                  {recipient?.status ? (
                    <StatusBadge status={recipient.status} />
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </dd>
              </div>
            </dl>

            {req.description && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-1">
                  Instructions
                </p>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto">
                  {req.description}
                </p>
              </div>
            )}
          </div>

          {/* Comments / Activity card */}
          <div
            className="flex-1 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-surface-400 dark:bg-surface-500"
            style={{ minHeight: "360px" }}
          >
            {/* Tab bar */}
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-surface-400 dark:bg-surface-600">
              <div className="flex items-center gap-1">
                {(["comments", "activity"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setLeftTab(tab)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      leftTab === tab
                        ? "bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-surface-500 dark:text-slate-100 dark:border-surface-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab === "comments" ? (
                      <MessageSquare size={12} />
                    ) : (
                      <Activity size={12} />
                    )}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === "comments" && messages.length > 0 && (
                      <span className="rounded-full bg-sky-100 px-1.5 text-[10px] font-bold text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                        {messages.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/30 dark:bg-surface-600/30 space-y-4">
              {leftTab === "comments" ? (
                messagesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <MessageSquare
                      size={28}
                      className="text-slate-300 dark:text-slate-600"
                    />
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      No comments yet. Start the conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMine={msg.sender_user_id === myUserId}
                    />
                  ))
                )
              ) : // Activity tab
              activityLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Activity
                    size={28}
                    className="text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    No activity recorded yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activityLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-white/60 dark:hover:bg-surface-500/40 transition"
                    >
                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {log.label}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Comment input */}
            {leftTab === "comments" && (
              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-surface-400 dark:bg-surface-500">
                {postErr && (
                  <p className="mb-2 text-xs text-rose-600 dark:text-rose-400">
                    {postErr}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        postComment();
                      }
                    }}
                    placeholder="Write a comment…"
                    disabled={posting}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:opacity-50 dark:border-surface-400 dark:bg-surface-600 dark:text-slate-200 dark:placeholder-slate-500"
                  />
                  <button
                    onClick={postComment}
                    disabled={!commentText.trim() || posting}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition hover:bg-sky-700 disabled:opacity-40"
                  >
                    {posting ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── RIGHT PANE ────────────────────────────────────────────── */}
        <aside className="lg:col-span-5 flex flex-col">
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-400 dark:bg-surface-500">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-surface-400 dark:bg-surface-600">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  {(["example", "submission"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRightTab(tab)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        rightTab === tab
                          ? "bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-surface-500 dark:text-slate-100 dark:border-surface-300"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                {rightTab === "example" && req.example_preview_path && (
                  <button
                    onClick={() => loadExamplePreview()}
                    disabled={examplePreviewLoading}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition dark:hover:bg-surface-400 dark:hover:text-slate-200 disabled:opacity-40"
                  >
                    <RefreshCw
                      size={11}
                      className={examplePreviewLoading ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {rightTab === "example"
                  ? "Reference file attached by QA."
                  : isQa
                    ? "Review evidence submitted by the office."
                    : "Upload your evidence file here."}
              </p>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col min-h-0 p-4 gap-4">
              {/* ── EXAMPLE TAB ── */}
              {rightTab === "example" && (
                <>
                  <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-surface-400 dark:bg-surface-600">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Example file
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {req.example_original_filename ??
                        (req.example_file_path ? "Attached" : "None provided")}
                    </p>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-surface-400 dark:bg-surface-600">
                    {!req.example_preview_path ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                        No example file attached.
                      </div>
                    ) : examplePreviewLoading ? (
                      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
                        <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                        Loading preview…
                      </div>
                    ) : examplePreviewError ? (
                      <div className="flex h-full items-center justify-center text-sm text-rose-600 dark:text-rose-400">
                        {examplePreviewError}
                      </div>
                    ) : examplePreviewUrl ? (
                      <iframe
                        title="Example preview"
                        src={examplePreviewUrl}
                        className="h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Preview not loaded.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── SUBMISSION TAB ── */}
              {rightTab === "submission" && (
                <div className="flex flex-col flex-1 min-h-0 gap-4">
                  {/* Attempt selector */}
                  {submissions.length > 0 && (
                    <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-surface-400 dark:bg-surface-600">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            Attempt
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {submissions.length} submission(s) total
                          </p>
                        </div>
                        <div className="relative">
                          <select
                            value={selectedSubmission?.id ?? ""}
                            onChange={(e) =>
                              setSelectedSubmissionId(
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }
                            className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 py-1.5 text-xs text-slate-700 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-200"
                          >
                            <option value="">None</option>
                            {submissions.map((s) => (
                              <option key={s.id} value={s.id}>
                                #{s.attempt_no} —{" "}
                                {String(s.status).toUpperCase()}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected submission info */}
                  {selectedSubmission && (
                    <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-surface-400 dark:bg-surface-600">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            File
                          </p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {selectedSubmission.files?.[0]?.original_filename ??
                              "No file"}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Attempt #{selectedSubmission.attempt_no}
                            </span>
                            <StatusBadge status={selectedSubmission.status} />
                          </div>
                          {selectedSubmission.qa_review_note && (
                            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic">
                              QA note: {selectedSubmission.qa_review_note}
                            </p>
                          )}
                        </div>
                        {selectedFileId && (
                          <button
                            onClick={async () => {
                              const win = window.open("about:blank", "_blank");
                              const res =
                                await getDocumentRequestSubmissionFileDownloadLink(
                                  selectedFileId,
                                );
                              if (win) win.location.href = res.url;
                            }}
                            className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition dark:border-surface-300 dark:bg-surface-500 dark:text-slate-300"
                          >
                            <Download size={11} />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* QA review panel */}
                  {isQa && (
                    <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-3 dark:border-surface-400 dark:bg-surface-600">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        QA Review
                      </p>
                      <textarea
                        rows={2}
                        value={qaNote}
                        onChange={(e) => setQaNote(e.target.value)}
                        placeholder="Optional note…"
                        disabled={reviewing}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-200 dark:placeholder-slate-500"
                      />
                      {reviewMsg && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400">
                          <CheckCircle size={12} /> {reviewMsg}
                        </div>
                      )}
                      {reviewErr && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400">
                          <XCircle size={12} /> {reviewErr}
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={!canQaReview || reviewing}
                          onClick={() => qaReview("rejected")}
                          className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                        <button
                          disabled={!canQaReview || reviewing}
                          onClick={() => qaReview("accepted")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle size={12} /> Accept
                        </button>
                      </div>
                      {!canQaReview && selectedSubmission?.id && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Review only available when status is SUBMITTED.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Office upload */}
                  {!isQa && (
                    <div className="shrink-0 space-y-3">
                      {showLockNotice && (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                          <Clock size={13} />
                          Waiting for QA review. You cannot resubmit yet.
                        </div>
                      )}
                      {!canSubmit && req.status !== "open" && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-surface-400 dark:bg-surface-600 dark:text-slate-400">
                          This request is closed.
                        </div>
                      )}
                      {hasLocalFile && (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-surface-400">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-surface-400 dark:bg-surface-600">
                              <div>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Local preview
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {files[0].name}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFiles([])}
                                disabled={submitting}
                              >
                                Change
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Note{" "}
                              <span className="text-slate-400">(optional)</span>
                            </label>
                            <textarea
                              rows={2}
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              placeholder="Optional message to QA…"
                              disabled={submitting}
                              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-200 dark:placeholder-slate-500"
                            />
                          </div>
                          {submitMsg && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400">
                              <CheckCircle size={12} /> {submitMsg}
                            </div>
                          )}
                          {submitErr && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400">
                              <XCircle size={12} /> {submitErr}
                            </div>
                          )}
                          <div className="flex justify-end">
                            <button
                              onClick={submit}
                              disabled={submitting || files.length !== 1}
                              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition"
                            >
                              <Upload size={13} />
                              {submitting ? "Submitting…" : "Submit"}
                            </button>
                          </div>
                        </div>
                      )}
                      {showUploadArea && (
                        <>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSelectFiles(e.dataTransfer.files);
                            }}
                            className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center hover:border-sky-300 hover:bg-sky-50/30 transition dark:border-surface-400 dark:bg-surface-600 dark:hover:border-sky-700"
                          >
                            <Upload
                              size={22}
                              className="mx-auto text-slate-300 dark:text-slate-600"
                            />
                            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                              Drop your file here
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              PDF, Word, Excel, PowerPoint · max 10MB
                            </p>
                            <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition">
                              <Upload size={12} /> Choose file
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                onChange={(e) =>
                                  handleSelectFiles(e.target.files)
                                }
                              />
                            </label>
                          </div>
                          {submitErr && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400">
                              <XCircle size={12} /> {submitErr}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Submission preview */}
                  <div
                    className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-surface-400 dark:bg-surface-600 flex flex-col"
                    style={{ minHeight: "200px" }}
                  >
                    {/* Toolbar */}
                    {(hasLocalFile || submissionPreviewUrl) && (
                      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 dark:border-surface-400 dark:bg-surface-500">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[60%]">
                          {hasLocalFile
                            ? files[0]?.name
                            : (selectedSubmission?.files?.[0]
                                ?.original_filename ?? "Preview")}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Download */}
                          {selectedFileId && !hasLocalFile && (
                            <button
                              onClick={async () => {
                                const win = window.open(
                                  "about:blank",
                                  "_blank",
                                );
                                const res =
                                  await getDocumentRequestSubmissionFileDownloadLink(
                                    selectedFileId,
                                  );
                                if (win) win.location.href = res.url;
                              }}
                              title="Download"
                              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition dark:hover:bg-surface-400 dark:hover:text-slate-200"
                            >
                              <Download size={12} /> Download
                            </button>
                          )}
                          {/* Fullscreen modal */}
                          <button
                            onClick={() => {
                              const url = hasLocalFile
                                ? localPreviewUrl
                                : submissionPreviewUrl;
                              const name = hasLocalFile
                                ? files[0]?.name
                                : selectedSubmission?.files?.[0]
                                    ?.original_filename;
                              if (url) setPreviewModal({ url, filename: name });
                            }}
                            title="Fullscreen preview"
                            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition dark:hover:bg-surface-400 dark:hover:text-slate-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                            </svg>
                            View
                          </button>
                        </div>
                      </div>
                    )}
                    {hasLocalFile ? (
                      <iframe
                        title="Local preview"
                        src={localPreviewUrl}
                        className="flex-1 min-h-0 w-full"
                      />
                    ) : !selectedFileId ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                        No submission to preview.
                      </div>
                    ) : submissionPreviewLoading ? (
                      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
                        <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                        Loading preview…
                      </div>
                    ) : submissionPreviewError ? (
                      <div className="flex h-full items-center justify-center text-sm text-rose-600 dark:text-rose-400">
                        {submissionPreviewError}
                      </div>
                    ) : submissionPreviewUrl ? (
                      <iframe
                        title="Submission preview"
                        src={submissionPreviewUrl}
                        className="h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Preview not loaded.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
      {previewModal && (
        <PreviewModal
          url={previewModal.url}
          filename={previewModal.filename}
          onClose={() => setPreviewModal(null)}
        />
      )}
    </PageFrame>
  );
}
