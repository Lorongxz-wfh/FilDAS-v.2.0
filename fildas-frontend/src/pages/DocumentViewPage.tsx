import React from "react";
import {
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import { getAuthUser } from "../lib/auth";
import {
  getDocument,
  getDocumentVersions,
  getDocumentPreviewLink,
  listDocumentMessages,
  postDocumentMessage,
  type Document,
  type DocumentVersion,
  type DocumentMessage,
} from "../services/documents";
import { listActivityLogs } from "../services/activityApi";
import type { ActivityLogItem } from "../services/types";
import { getUserRole, isQA, isSysAdmin } from "../lib/roleFilters";
import ShareDocumentModal from "../components/documents/ShareDocumentModal";
import Button from "../components/ui/Button";
import {
  Download,
  ExternalLink,
  Share2,
  Send,
  Maximize2,
  X,
  RefreshCw,
  FileText,
  ChevronDown,
  GitBranch,
} from "lucide-react";
import CommentBubble from "../components/documents/documentFlow/CommentBubble";
import { formatDate, formatDateTime } from "../utils/formatters";

// ── Type badge ────────────────────────────────────────────────────────────────
const TYPE_STYLES: Record<string, string> = {
  internal: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  external: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  forms: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_STYLES[type?.toLowerCase()] ?? "bg-slate-100 text-slate-600 dark:bg-surface-400 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}>
      {type || "—"}
    </span>
  );
}

// ── Compact field ─────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
        {value ?? "—"}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocumentViewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  const docId = Number(params.id);
  const parentCrumbs: { label: string; to?: string }[] =
    (location.state as any)?.breadcrumbs ?? [{ label: "Library", to: "/documents" }];
  if (!Number.isFinite(docId) || docId <= 0) return <Navigate to="/documents" replace />;

  const role = getUserRole();
  const myId = Number(me?.id ?? 0);
  const myOfficeId = Number(me?.office?.id ?? me?.office_id ?? 0);

  // ── State ───────────────────────────────────────────────────────────────────
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [doc, setDoc] = React.useState<Document | null>(null);
  const [version, setVersion] = React.useState<DocumentVersion | null>(null);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  const [messages, setMessages] = React.useState<DocumentMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [postErr, setPostErr] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const prevMsgCountRef = React.useRef(0);
  const isFirstMsgRef = React.useRef(true);
  const [newMsgCount, setNewMsgCount] = React.useState(0);

  const [infoCollapsed, setInfoCollapsed] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [leftTab, setLeftTab] = React.useState<"comments" | "timeline">("comments");
  const [timeline, setTimeline] = React.useState<ActivityLogItem[]>([]);
  const [timelineLoading, setTimelineLoading] = React.useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [docData, versions] = await Promise.all([
          getDocument(docId),
          getDocumentVersions(docId),
        ]);
        if (!alive) return;
        setDoc(docData);
        const distributed = versions.filter((v) => v.status.toLowerCase() === "distributed");
        setVersion(distributed[0] ?? versions[0] ?? null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load document.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [docId]);

  // ── Preview link ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!version?.preview_path) { setPreviewUrl(null); return; }
    setPreviewLoading(true);
    setPreviewError(null);
    getDocumentPreviewLink(version.id)
      .then((r) => setPreviewUrl(r.url))
      .catch((e: any) => setPreviewError(e?.message ?? "Failed to load preview."))
      .finally(() => setPreviewLoading(false));
  }, [version?.id]);

  // ── Messages ────────────────────────────────────────────────────────────────
  const loadMessages = React.useCallback(async () => {
    if (!version?.id) return;
    setMessagesLoading(true);
    try {
      const msgs = await listDocumentMessages(version.id);
      setMessages(msgs);
    } catch { /* silent */ }
    finally { setMessagesLoading(false); }
  }, [version?.id]);

  React.useEffect(() => { loadMessages(); }, [loadMessages]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      if (!version?.id) return;
      loadMessages().then(() => {
        if (isFirstMsgRef.current) { isFirstMsgRef.current = false; prevMsgCountRef.current = messages.length; return; }
        const n = messages.length - prevMsgCountRef.current;
        if (n > 0) setNewMsgCount((p) => p + n);
        prevMsgCountRef.current = messages.length;
      });
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [version?.id, loadMessages, messages.length]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Activity timeline ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!docId) return;
    let alive = true;
    setTimelineLoading(true);
    listActivityLogs({ scope: "document", document_id: docId, per_page: 100, category: "workflow" })
      .then((p) => { if (alive) setTimeline(p.data); })
      .catch(() => {})
      .finally(() => { if (alive) setTimelineLoading(false); });
    return () => { alive = false; };
  }, [docId]);


  // ── Permissions ─────────────────────────────────────────────────────────────
  const isOwner = React.useMemo(
    () => !!myOfficeId && !!doc?.owner_office_id && myOfficeId === Number(doc.owner_office_id),
    [doc, myOfficeId],
  );

  const canOpenFlow = React.useMemo(() => {
    if (!doc) return false;
    if (isQA(role) || isSysAdmin(role) || role === "ADMIN") return true;
    if (isOwner) return true;
    if (doc.created_by && doc.created_by === myId) return true;
    if ((doc as any).was_participant === true) return true;
    return false;
  }, [doc, role, isOwner, myId]);

  const canShare = (isOwner || isQA(role) || isSysAdmin(role)) && version?.status === "Distributed";

  // ── Post comment ─────────────────────────────────────────────────────────────
  const postComment = async () => {
    const text = commentText.trim();
    if (!text || posting || !version?.id) return;
    setPosting(true);
    setPostErr(null);
    try {
      const msg = await postDocumentMessage(version.id, { message: text, type: "comment" });
      setMessages((prev) => [...prev, msg]);
      setCommentText("");
    } catch (e: any) {
      setPostErr(e?.response?.data?.message ?? e?.message ?? "Failed to post.");
    } finally { setPosting(false); }
  };

  // ── Reload preview ──────────────────────────────────────────────────────────
  const reloadPreview = () => {
    if (!version?.id) return;
    setPreviewUrl(null);
    setPreviewLoading(true);
    setPreviewError(null);
    getDocumentPreviewLink(version.id)
      .then((r) => setPreviewUrl(r.url))
      .catch((e: any) => setPreviewError(e?.message ?? "Failed to load preview."))
      .finally(() => setPreviewLoading(false));
  };

  // ── Download ─────────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!version?.id) return;
    const win = window.open("about:blank", "_blank");
    try {
      const { url } = await getDocumentPreviewLink(version.id);
      if (win) win.location.href = url;
    } catch { win?.close(); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageFrame title="Document" onBack={() => navigate("/documents")}>
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400 dark:text-slate-500">Loading document…</span>
          </div>
        </div>
      </PageFrame>
    );
  }

  if (error || !doc) {
    return (
      <PageFrame title="Document" onBack={() => navigate("/documents")}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
          {error ?? "Document not found."}
        </div>
      </PageFrame>
    );
  }

  const ownerOffice = doc?.ownerOffice ?? (doc as any)?.office ?? null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <PageFrame
      title={doc.title}
      onBack={() => navigate("/documents")}
      breadcrumbs={parentCrumbs}
      right={
        <div className="flex items-center gap-2">
          {canShare && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              Share
            </Button>
          )}
          {version && (
            <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          )}
          {canOpenFlow && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate(`/documents/${docId}${version?.id ? `?version_id=${version.id}` : ""}`, { state: { from: `/documents/${docId}/view`, breadcrumbs: [...parentCrumbs, { label: doc.title, to: `/documents/${docId}/view` }] } })}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open flow
            </Button>
          )}
        </div>
      }
      contentClassName="!p-0 overflow-hidden h-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0 p-4 sm:p-5">

        {/* ── LEFT — info + comments ── */}
        <section className="lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">

          {/* Document info card — collapsible */}
          <div className="rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 overflow-hidden shrink-0">

            {/* Card header — click to toggle */}
            <button
              type="button"
              onClick={() => setInfoCollapsed((c) => !c)}
              className="w-full px-4 py-3 border-b border-slate-100 dark:border-surface-400 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-surface-400/40 transition-colors text-left"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-surface-400">
                <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {doc.title}
                </p>
                {doc.code && (
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500 tracking-wide">
                    {doc.code}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {version && (
                  <span className="rounded-full bg-slate-100 dark:bg-surface-400 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-300">
                    v{version.version_number}
                  </span>
                )}
                <TypeBadge type={doc.doctype} />
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${infoCollapsed ? "-rotate-90" : ""}`}
                />
              </div>
            </button>

            {/* Collapsible body */}
            {!infoCollapsed && (
              <>
                {/* Status strip */}
                <div className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    {version?.status ?? "Distributed"}
                  </span>
                  {version?.original_filename && (
                    <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-36" title={version.original_filename}>
                      {version.original_filename}
                    </span>
                  )}
                </div>

                {/* Metadata grid */}
                <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Office" value={ownerOffice ? ownerOffice.name : "—"} />
                  <Field
                    label="Office Code"
                    value={ownerOffice ? <span className="font-mono">{ownerOffice.code}</span> : "—"}
                  />
                  <Field label="Effective Date" value={formatDate(version?.effective_date)} />
                  <Field label="Distributed" value={formatDate((version as any)?.distributed_at)} />
                  <Field label="Created" value={formatDate(doc.created_at)} />
                  <Field
                    label="Doc Code"
                    value={doc.code ? <span className="font-mono text-[10px]">{doc.code}</span> : "—"}
                  />
                  {Array.isArray(doc.tags) && doc.tags.length > 0 && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Tags</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {doc.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-slate-200 dark:border-surface-400 bg-slate-50 dark:bg-surface-600 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Comments / Timeline card */}
          <div className="flex flex-col rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 overflow-hidden flex-1 min-h-0">

            {/* Tab header */}
            <div className="shrink-0 px-3 py-2 border-b border-slate-100 dark:border-surface-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-md bg-slate-100 dark:bg-surface-600 p-0.5">
                <button
                  type="button"
                  onClick={() => setLeftTab("comments")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-semibold transition-all ${leftTab === "comments" ? "bg-white dark:bg-surface-400 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  <Send className="h-3 w-3" />
                  Comments
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("timeline")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-semibold transition-all ${leftTab === "timeline" ? "bg-white dark:bg-surface-400 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  <GitBranch className="h-3 w-3" />
                  Timeline
                </button>
              </div>
              {leftTab === "comments" && newMsgCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    setNewMsgCount(0);
                  }}
                  className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 animate-pulse"
                >
                  {newMsgCount} new ↓
                </button>
              )}
            </div>

            {leftTab === "comments" ? (
              <>
                {/* Message list */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-5 w-5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 py-10">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-surface-400">
                        <Send className="h-4 w-4 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">No comments yet</p>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <CommentBubble
                        key={m.id}
                        senderName={m.sender?.full_name ?? "Unknown"}
                        roleName={m.sender?.role?.name ?? null}
                        when={formatDateTime(m.created_at)}
                        message={m.message}
                        type={m.type}
                        isMine={m.sender_user_id === myId}
                        avatarLetter={(m.sender?.full_name ?? "?").charAt(0).toUpperCase()}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-slate-100 dark:border-surface-400 px-3 py-2.5">
                  {postErr && (
                    <p className="mb-1.5 text-[11px] text-rose-600 dark:text-rose-400">{postErr}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); }
                      }}
                      placeholder="Write a comment…"
                      disabled={posting}
                      className="flex-1 rounded-md border border-slate-200 dark:border-surface-400 bg-slate-50 dark:bg-surface-600 px-3 py-2 text-xs outline-none transition focus:border-brand-400 disabled:opacity-50 dark:text-slate-200 dark:placeholder-slate-500"
                    />
                    <button
                      type="button"
                      onClick={postComment}
                      disabled={!commentText.trim() || posting}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40"
                    >
                      {posting ? (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Timeline */
              <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
                {timelineLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-5 w-5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 py-10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-surface-400">
                      <GitBranch className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">No workflow events yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-1.75 top-2 bottom-2 w-px bg-slate-200 dark:bg-surface-400" />
                    <div className="space-y-0">
                      {timeline.map((item, i) => {
                        const isLast = i === timeline.length - 1;
                        const dotColor =
                          item.event.includes("distributed") ? "bg-emerald-500" :
                          item.event.includes("registered") ? "bg-emerald-400" :
                          item.event.includes("rejected") || item.event.includes("cancelled") ? "bg-rose-500" :
                          item.event.includes("returned") ? "bg-amber-400" :
                          item.event.includes("approval") || item.event.includes("president") ? "bg-violet-400" :
                          item.event.includes("review") || item.event.includes("forwarded") ? "bg-sky-400" :
                          item.event.includes("created") || item.event.includes("revision") ? "bg-slate-400" :
                          "bg-brand-400";
                        return (
                          <div key={item.id} className={`flex gap-3 ${isLast ? "pb-0" : "pb-3"}`}>
                            <div className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white dark:border-surface-500 ${dotColor}`} />
                            <div className="min-w-0 flex-1 pb-0.5">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                                {item.label || item.event}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                {formatDateTime(item.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── RIGHT — preview ── */}
        <aside className="lg:col-span-8 flex flex-col min-h-0">
          <div className="rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 flex flex-col h-full overflow-hidden">

            {/* Preview toolbar */}
            <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 dark:border-surface-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Preview</span>
                {version?.original_filename && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-48" title={version.original_filename}>
                    — {version.original_filename}
                  </span>
                )}
              </div>
              {version?.preview_path && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={reloadPreview}
                    title="Reload preview"
                    className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-surface-400 px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-400 transition"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => setFullscreen(true)}
                      title="Fullscreen"
                      className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-surface-400 px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-400 transition"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Preview body */}
            <div className="flex-1 min-h-0">
              {previewLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="h-6 w-6 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                  <span className="text-xs text-slate-400 dark:text-slate-500">Loading preview…</span>
                </div>
              ) : previewError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30">
                    <X className="h-5 w-5 text-rose-400" />
                  </div>
                  <p className="text-xs text-rose-500 dark:text-rose-400">{previewError}</p>
                  <button
                    type="button"
                    onClick={reloadPreview}
                    className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : previewUrl ? (
                <iframe
                  title="Document preview"
                  src={previewUrl}
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-surface-400">
                    <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">No preview available</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Fullscreen preview */}
      {fullscreen && previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <span className="text-xs text-white/60 truncate">{version?.original_filename ?? "Preview"}</span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe
            title="Document preview fullscreen"
            src={previewUrl}
            className="flex-1 w-full border-0"
          />
        </div>
      )}

      <ShareDocumentModal
        open={shareOpen}
        documentId={doc.id}
        onClose={() => setShareOpen(false)}
        onSaved={() => {}}
      />
    </PageFrame>
  );
}
