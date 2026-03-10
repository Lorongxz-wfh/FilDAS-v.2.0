import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame.tsx";
import { getAuthUser } from "../lib/auth.ts";
import {
  getDocumentRequest,
  getDocumentRequestExamplePreviewLink,
  getDocumentRequestMessages,
  getDocumentRequestSubmissionFilePreviewLink,
  postDocumentRequestMessage,
  reviewDocumentRequestSubmission,
  submitDocumentRequestEvidence,
  type DocumentRequestMessageRow,
} from "../services/documentRequests";
import { MessageSquare, Activity } from "lucide-react";
import { roleLower, TabBar } from "../components/documentRequests/shared";
import RequestHeaderCard from "../components/documentRequests/RequestHeaderCard";
import RequestCommentsPanel from "../components/documentRequests/RequestCommentsPanel";
import RequestActivityPanel from "../components/documentRequests/RequestActivityPanel";
import RequestExampleTab from "../components/documentRequests/RequestExampleTab";
import RequestSubmissionTab from "../components/documentRequests/RequestSubmissionTab";
import RequestPreviewModal from "../components/documentRequests/RequestPreviewModal";

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

  // ── State ──────────────────────────────────────────────────────────────────
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
  const [selectedSubmissionId, setSelectedSubmissionId] = React.useState<
    number | null
  >(null);

  const [leftTab, setLeftTab] = React.useState<"comments" | "activity">(
    "comments",
  );
  const [rightTab, setRightTab] = React.useState<"example" | "submission">(
    "example",
  );

  const [messages, setMessages] = React.useState<DocumentRequestMessageRow[]>(
    [],
  );
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [postErr, setPostErr] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [newRequestMessageCount, setNewRequestMessageCount] = React.useState(0);
  const prevRequestMessageCountRef = React.useRef(0);
  const isFirstRequestMessageLoadRef = React.useRef(true);

  const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
  const [activityLoading, setActivityLoading] = React.useState(false);

  const [examplePreviewUrl, setExamplePreviewUrl] = React.useState("");
  const [examplePreviewLoading, setExamplePreviewLoading] =
    React.useState(false);
  const [examplePreviewError, setExamplePreviewError] = React.useState<
    string | null
  >(null);

  const [submissionPreviewUrl, setSubmissionPreviewUrl] = React.useState("");
  const [submissionPreviewLoading, setSubmissionPreviewLoading] =
    React.useState(false);
  const [submissionPreviewError, setSubmissionPreviewError] = React.useState<
    string | null
  >(null);

  const [files, setFiles] = React.useState<File[]>([]);
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMsg, setSubmitMsg] = React.useState<string | null>(null);
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);

  const [previewModal, setPreviewModal] = React.useState<{
    url: string;
    filename?: string;
  } | null>(null);

  const [qaNote, setQaNote] = React.useState("");
  const [reviewing, setReviewing] = React.useState(false);
  const [reviewErr, setReviewErr] = React.useState<string | null>(null);
  const [reviewMsg, setReviewMsg] = React.useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedSubmission = React.useMemo(() => {
    if (!selectedSubmissionId) return latestSubmission;
    return (
      submissions.find((s) => Number(s.id) === Number(selectedSubmissionId)) ??
      latestSubmission
    );
  }, [selectedSubmissionId, submissions, latestSubmission]);

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

  // ── Loaders ────────────────────────────────────────────────────────────────
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

  const loadMessages = React.useCallback(async () => {
    setMessagesLoading(true);
    try {
      setMessages(await getDocumentRequestMessages(requestId));
    } catch {
      /* silent */
    } finally {
      setMessagesLoading(false);
    }
  }, [requestId]);

  React.useEffect(() => {
    loadMessages().catch(() => {});
  }, [loadMessages]);

  // Poll messages every 10s + detect new ones
  React.useEffect(() => {
    const interval = window.setInterval(async () => {
      const prev = messages.length;
      await loadMessages().catch(() => {});
      if (isFirstRequestMessageLoadRef.current) {
        isFirstRequestMessageLoadRef.current = false;
        prevRequestMessageCountRef.current = prev;
        return;
      }
      // detection happens in the effect below
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [loadMessages, messages.length]);

  // Detect new request messages from polling
  React.useEffect(() => {
    if (isFirstRequestMessageLoadRef.current) return;
    const newCount = messages.length - prevRequestMessageCountRef.current;
    if (newCount > 0) {
      setNewRequestMessageCount((p) => p + newCount);
    }
    prevRequestMessageCountRef.current = messages.length;
  }, [messages.length]);
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const loadExamplePreview = React.useCallback(async () => {
    if (!req?.example_preview_path) {
      setExamplePreviewUrl("");
      return;
    }
    setExamplePreviewLoading(true);
    setExamplePreviewError(null);
    try {
      setExamplePreviewUrl(
        (await getDocumentRequestExamplePreviewLink(requestId)).url,
      );
    } catch (e: any) {
      setExamplePreviewError(
        e?.response?.data?.message ?? "Failed to load preview.",
      );
    } finally {
      setExamplePreviewLoading(false);
    }
  }, [req?.example_preview_path, requestId]);

  React.useEffect(() => {
    loadExamplePreview().catch(() => {});
  }, [loadExamplePreview]);

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

  // ── Handlers ───────────────────────────────────────────────────────────────
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
      setPostErr(e?.response?.data?.message ?? "Failed to post.");
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
      setSubmitErr(e?.response?.data?.message ?? "Submit failed.");
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
      setReviewErr(e?.response?.data?.message ?? "Review failed.");
    } finally {
      setReviewing(false);
    }
  };

  // ── Loading / error ────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageFrame
      title={req.title ?? `Request #${requestId}`}
      onBack={() => navigate("/document-requests")}
    >
      <div className="grid h-full min-h-0 overflow-hidden grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ── LEFT ── */}
        <section className="lg:col-span-7 min-w-0 flex flex-col gap-5">
          <RequestHeaderCard
            requestId={requestId}
            req={req}
            recipient={recipient}
          />

          <div
            className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-surface-400 dark:bg-surface-500"
            style={{ height: "420px" }}
          >
            <TabBar
              tabs={[
                {
                  value: "comments" as const,
                  label: "Comments",
                  icon: <MessageSquare size={12} />,
                },
                {
                  value: "activity" as const,
                  label: "Activity",
                  icon: <Activity size={12} />,
                },
              ]}
              active={leftTab}
              onChange={setLeftTab}
              badge={{
                comments: messages.length > 0 ? messages.length : undefined,
              }}
            />
            {leftTab === "comments" ? (
              <RequestCommentsPanel
                messages={messages}
                loading={messagesLoading}
                myUserId={myUserId}
                commentText={commentText}
                posting={posting}
                postErr={postErr}
                messagesEndRef={messagesEndRef}
                onCommentChange={setCommentText}
                onPost={postComment}
                newMessageCount={newRequestMessageCount}
                onClearNewMessages={() => setNewRequestMessageCount(0)}
              />
            ) : (
              <RequestActivityPanel
                logs={activityLogs}
                loading={activityLoading}
              />
            )}
          </div>
        </section>

        {/* ── RIGHT ── */}
        <aside className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-400 dark:bg-surface-500">
            <TabBar
              tabs={[
                { value: "example" as const, label: "Example" },
                { value: "submission" as const, label: "Submission" },
              ]}
              active={rightTab}
              onChange={setRightTab}
            />
            <div className="flex flex-1 flex-col min-h-0 overflow-y-auto p-4 gap-3">
              {rightTab === "example" ? (
                <RequestExampleTab
                  req={req}
                  examplePreviewUrl={examplePreviewUrl}
                  examplePreviewLoading={examplePreviewLoading}
                  examplePreviewError={examplePreviewError}
                  onRefresh={loadExamplePreview}
                  onViewModal={() =>
                    setPreviewModal({
                      url: examplePreviewUrl,
                      filename: req.example_original_filename,
                    })
                  }
                />
              ) : (
                <RequestSubmissionTab
                  isQa={isQa}
                  req={req}
                  submissions={submissions}
                  selectedSubmission={selectedSubmission}
                  selectedSubmissionId={selectedSubmissionId}
                  selectedFileId={selectedFileId}
                  onSelectSubmission={setSelectedSubmissionId}
                  qaNote={qaNote}
                  reviewing={reviewing}
                  reviewErr={reviewErr}
                  reviewMsg={reviewMsg}
                  canQaReview={canQaReview}
                  onQaNoteChange={setQaNote}
                  onQaReview={qaReview}
                  files={files}
                  localPreviewUrl={localPreviewUrl}
                  hasLocalFile={hasLocalFile}
                  showUploadArea={showUploadArea}
                  showLockNotice={showLockNotice}
                  canSubmit={canSubmit}
                  note={note}
                  submitting={submitting}
                  submitMsg={submitMsg}
                  submitErr={submitErr}
                  onNoteChange={setNote}
                  onSelectFiles={handleSelectFiles}
                  onRemoveFile={() => setFiles([])}
                  onSubmit={submit}
                  submissionPreviewUrl={submissionPreviewUrl}
                  submissionPreviewLoading={submissionPreviewLoading}
                  submissionPreviewError={submissionPreviewError}
                  onViewModal={(url, filename) =>
                    setPreviewModal({ url, filename })
                  }
                />
              )}
            </div>
          </div>
        </aside>
      </div>

      {previewModal && (
        <RequestPreviewModal
          url={previewModal.url}
          filename={previewModal.filename}
          onClose={() => setPreviewModal(null)}
        />
      )}
    </PageFrame>
  );
}
