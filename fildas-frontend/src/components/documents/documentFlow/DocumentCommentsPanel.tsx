import React from "react";
import Skeleton from "../../ui/loader/Skeleton";
import type { DocumentMessage } from "../../../services/documents";
import CommentBubble from "./CommentBubble";
import { getAuthUser } from "../../../lib/auth";

type Props = {
  isLoading: boolean;
  messages: DocumentMessage[];
  draftMessage: string;
  setDraftMessage: (v: string) => void;
  isSending: boolean;
  onSend: () => Promise<void>;
  formatWhen: (iso: string) => string;
  panelHeight: number;
  newMessageCount?: number;
  clearNewMessageCount?: () => void;
};

const DocumentCommentsPanel: React.FC<Props> = ({
  isLoading,
  messages,
  draftMessage,
  setDraftMessage,
  isSending,
  onSend,
  formatWhen,
  panelHeight,
  newMessageCount = 0,
  clearNewMessageCount,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const myUserId = getAuthUser()?.id ?? null;

  // Track which message IDs are "new" (arrived via polling)
  const [newMessageIds, setNewMessageIds] = React.useState<Set<number>>(
    new Set(),
  );
  const prevMessageIdsRef = React.useRef<Set<number>>(new Set());
  const isFirstRenderRef = React.useRef(true);

  // Detect new messages from polling
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevMessageIdsRef.current = new Set(messages.map((m) => m.id));
      return;
    }

    const incoming = messages.filter(
      (m) =>
        !prevMessageIdsRef.current.has(m.id) &&
        Number(m.sender_user_id) !== Number(myUserId),
    );

    if (incoming.length > 0) {
      setNewMessageIds((prev) => {
        const next = new Set(prev);
        incoming.forEach((m) => next.add(m.id));
        return next;
      });
      // Clear highlight after 4s
      window.setTimeout(() => {
        setNewMessageIds((prev) => {
          const next = new Set(prev);
          incoming.forEach((m) => next.delete(m.id));
          return next;
        });
      }, 4000);
    }

    prevMessageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  // Auto-scroll only when user's own message sent (not on poll)
  const prevCountRef = React.useRef(0);
  React.useEffect(() => {
    const myMessages = messages.filter(
      (m) => Number(m.sender_user_id) === Number(myUserId),
    );
    if (myMessages.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = myMessages.length;
  }, [messages]);

  const handleScrollToNew = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    clearNewMessageCount?.();
  };

  return (
    <div className="space-y-2">
      {/* New message pill */}
      {newMessageCount > 0 && (
        <button
          type="button"
          onClick={handleScrollToNew}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-sky-600 transition animate-pulse"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          {newMessageCount} new message{newMessageCount > 1 ? "s" : ""} · Click
          to scroll
        </button>
      )}

      {/* Scrollable message area */}
      <div
        ref={scrollRef}
        className="overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 dark:border-surface-400 dark:bg-surface-600/60 transition-all duration-200"
        style={{ height: panelHeight }}
      >
        {isLoading ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              No comments yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {messages.map((m) => (
              <CommentBubble
                key={m.id}
                senderName={m.sender?.full_name ?? "Unknown"}
                roleName={m.sender?.role?.name}
                when={formatWhen(m.created_at)}
                message={m.message}
                type={m.type}
                isNew={newMessageIds.has(m.id)}
                isMine={Number(m.sender_user_id) === Number(myUserId)}
                avatarLetter={(m.sender?.full_name ?? "?")
                  .charAt(0)
                  .toUpperCase()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex gap-2">
        <textarea
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm resize-none outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-surface-400 dark:bg-surface-500 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-sky-900/30 transition"
          rows={2}
          value={draftMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
          placeholder="Write a comment… (Ctrl+Enter to send)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (!isSending && draftMessage.trim()) onSend();
            }
          }}
        />
        <button
          type="button"
          disabled={isSending || draftMessage.trim().length === 0}
          onClick={onSend}
          className="rounded-lg px-3 py-2 text-xs font-semibold transition bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
};

export default DocumentCommentsPanel;
