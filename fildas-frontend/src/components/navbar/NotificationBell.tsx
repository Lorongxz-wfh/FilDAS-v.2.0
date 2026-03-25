import React from "react";
import { useNavigate } from "react-router-dom";
import { BellRing } from "lucide-react";
import InlineSpinner from "../ui/loader/InlineSpinner";
import SkeletonList from "../ui/loader/SkeletonList";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../../services/documents";
import { playNotificationChime } from "../../utils/notificationSound";

const SEEN_AT_KEY = "notif_seen_at";

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = React.useState(false);
  const [unseenCount, setUnseenCount] = React.useState<number>(0);
  const [notifItems, setNotifItems] = React.useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifError, setNotifError] = React.useState<string | null>(null);

  // seenAt: timestamp (ms) of last time dropdown was opened
  const [seenAt, setSeenAt] = React.useState<number>(() =>
    parseInt(localStorage.getItem(SEEN_AT_KEY) ?? "0", 10)
  );

  const prevUnreadRef = React.useRef<number>(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Recompute unseen count from loaded items
  const computeUnseen = React.useCallback(
    (items: NotificationItem[], seen: number) =>
      items.filter((n) => !n.read_at && new Date(n.created_at).getTime() > seen).length,
    []
  );

  async function refreshNotifBadge(currentSeenAt: number) {
    const n = await getUnreadNotificationCount();
    if (n > prevUnreadRef.current) {
      playNotificationChime();
      window.dispatchEvent(new Event("page:remote-refresh"));
    }
    prevUnreadRef.current = n;
    // Only use API count for badge when we have no items loaded yet
    setUnseenCount((prev) =>
      notifItems.length === 0 ? n : computeUnseen(notifItems, currentSeenAt) > 0 ? computeUnseen(notifItems, currentSeenAt) : prev
    );
  }

  async function loadDropdown(currentSeenAt: number) {
    setNotifLoading(notifItems.length === 0);
    setNotifError(null);
    try {
      const { data } = await listNotifications({ page: 1, perPage: 5 });
      setNotifItems(data);
      setUnseenCount(computeUnseen(data, currentSeenAt));
      await getUnreadNotificationCount().then((n) => { prevUnreadRef.current = n; });
    } catch (e: any) {
      setNotifError(e?.message ?? "Failed to load notifications.");
    } finally {
      setNotifLoading(false);
    }
  }

  const notifPollRef = React.useRef<number | null>(null);
  const notifBurstTimeoutRef = React.useRef<number | null>(null);
  const seenAtRef = React.useRef<number>(seenAt);
  seenAtRef.current = seenAt;
  const isOpenRef = React.useRef<boolean>(false);
  isOpenRef.current = isOpen;

  function stopPolling() {
    if (notifPollRef.current) window.clearInterval(notifPollRef.current);
    notifPollRef.current = null;
    if (notifBurstTimeoutRef.current) window.clearTimeout(notifBurstTimeoutRef.current);
    notifBurstTimeoutRef.current = null;
  }

  function startPolling(mode: "idle" | "open" | "burst") {
    stopPolling();
    const ms = mode === "open" ? 8000 : mode === "burst" ? 5000 : 10000;
    notifPollRef.current = window.setInterval(async () => {
      if (isOpenRef.current) {
        await loadDropdown(seenAtRef.current).catch(() => {});
      } else {
        await refreshNotifBadge(seenAtRef.current).catch(() => {});
      }
    }, ms);
    if (mode === "burst") {
      notifBurstTimeoutRef.current = window.setTimeout(() => {
        startPolling(isOpenRef.current ? "open" : "idle");
      }, 8000);
    }
  }

  React.useEffect(() => {
    refreshNotifBadge(seenAt).catch(() => {});
    startPolling("idle");
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside to close
  React.useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        startPolling("idle");
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  React.useEffect(() => {
    const onRefresh = () => {
      if (isOpenRef.current) {
        loadDropdown(seenAtRef.current).catch(() => {});
      } else {
        refreshNotifBadge(seenAtRef.current).catch(() => {});
      }
      startPolling("burst");
    };
    window.addEventListener("notifications:refresh", onRefresh);
    return () => window.removeEventListener("notifications:refresh", onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDropdown() {
    const now = Date.now();
    setSeenAt(now);
    seenAtRef.current = now;
    localStorage.setItem(SEEN_AT_KEY, String(now));
    setUnseenCount(0);
    setIsOpen(true);
    loadDropdown(now);
    startPolling("open");
  }

  function closeDropdown() {
    setIsOpen(false);
    startPolling("idle");
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        className="relative rounded-md p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-surface-400 dark:hover:text-slate-200 transition"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <BellRing className="h-4 w-4" />
        {unseenCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unseenCount > 99 ? "99+" : unseenCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-4 top-14 w-72 rounded-xl border border-slate-200 bg-white shadow-md dark:border-surface-400 dark:bg-surface-500"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-surface-400">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Inbox
            </div>
            {notifLoading && <InlineSpinner className="h-3 w-3 border-2" />}
          </div>

          <div className="max-h-56 overflow-auto px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
            {notifItems.length === 0 && notifLoading ? (
              <div className="py-2">
                <SkeletonList rows={4} rowClassName="h-10 rounded-md" />
              </div>
            ) : notifError ? (
              <div className="py-4 text-slate-500 dark:text-slate-400">{notifError}</div>
            ) : notifItems.length === 0 ? (
              <div className="py-4 text-slate-500 dark:text-slate-400">Inbox is empty.</div>
            ) : (
              <div className="space-y-2">
                {notifItems.map((n) => {
                  const createdMs = new Date(n.created_at).getTime();
                  const isUnseen = !n.read_at && createdMs > seenAt;
                  const isSeenNotRead = !n.read_at && !isUnseen;

                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={[
                        "w-full rounded-md border px-3 py-2 text-left transition",
                        isUnseen
                          ? "border-sky-200 bg-sky-50 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-950/60"
                          : isSeenNotRead
                            ? "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-surface-300 dark:bg-surface-400/50 dark:hover:bg-surface-400"
                            : "border-slate-100 bg-white hover:bg-slate-50 dark:border-surface-400 dark:bg-surface-600 dark:hover:bg-surface-400",
                      ].join(" ")}
                      onClick={async () => {
                        try {
                          if (!n.read_at) {
                            await markNotificationRead(n.id);
                            setNotifItems((prev) =>
                              prev.map((item) =>
                                item.id === n.id
                                  ? { ...item, read_at: new Date().toISOString() }
                                  : item
                              )
                            );
                            setUnseenCount((prev) => Math.max(0, prev - (isUnseen ? 1 : 0)));
                          }
                          closeDropdown();
                          startPolling("burst");
                          const noLink = Boolean((n as any)?.meta?.no_link);
                          if (noLink) return;
                          if (n.document_id) {
                            const toView = (n as any)?.meta?.status === "Distributed";
                            navigate(
                              toView
                                ? `/documents/${n.document_id}/view`
                                : `/documents/${n.document_id}`,
                              toView ? undefined : { state: { from: "/work-queue" } }
                            );
                          } else {
                            const reqId = (n as any)?.meta?.document_request_id;
                            navigate(reqId ? `/document-requests/${reqId}` : "/inbox");
                          }
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div
                            className={[
                              "truncate text-xs font-semibold",
                              isUnseen || isSeenNotRead
                                ? "text-slate-900 dark:text-slate-100"
                                : "text-slate-600 dark:text-slate-300",
                            ].join(" ")}
                          >
                            {n.title}
                          </div>
                          {n.body && (
                            <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                              {n.body}
                            </div>
                          )}
                        </div>
                        {/* Unseen = solid blue dot, seen-not-read = hollow dot */}
                        {isUnseen && (
                          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                        )}
                        {isSeenNotRead && (
                          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full border-2 border-slate-400 dark:border-slate-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 dark:border-surface-400">
            <button
              type="button"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              onClick={async () => {
                try {
                  await markAllNotificationsRead();
                  await loadDropdown(seenAt);
                  startPolling("burst");
                } catch {
                  /* ignore */
                }
              }}
            >
              Mark all as read
            </button>
            <button
              type="button"
              className="text-xs font-medium text-sky-700 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
              onClick={() => {
                closeDropdown();
                navigate("/inbox");
              }}
            >
              View all
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;
