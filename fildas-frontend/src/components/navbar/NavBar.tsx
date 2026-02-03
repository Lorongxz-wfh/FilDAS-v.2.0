import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "../../hooks/useAuthUser"; // adjust path
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

interface NavbarProps {
  title?: string;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ title = "FilDAS", onLogout }) => {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [notifUnread, setNotifUnread] = React.useState<number>(0);
  const [notifItems, setNotifItems] = React.useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifError, setNotifError] = React.useState<string | null>(null);

  async function refreshNotifBadge() {
    const n = await getUnreadNotificationCount();
    setNotifUnread(n);
  }

  async function loadNotifDropdown() {
    // If we already have items, keep showing them and just "quiet refresh"
    setNotifLoading(notifItems.length === 0);
    setNotifError(null);

    try {
      const { data } = await listNotifications({ page: 1, perPage: 5 });
      setNotifItems(data);
      await refreshNotifBadge();
    } catch (e: any) {
      setNotifError(e?.message ?? "Failed to load notifications.");
    } finally {
      setNotifLoading(false);
    }
  }

  const notifPollRef = React.useRef<number | null>(null);
  const notifBurstTimeoutRef = React.useRef<number | null>(null);

  async function refreshNotifications(opts?: { includeList?: boolean }) {
    // always refresh badge
    await refreshNotifBadge();

    // optionally refresh dropdown list (only makes sense when open)
    if (opts?.includeList) {
      try {
        const { data } = await listNotifications({ page: 1, perPage: 5 });
        setNotifItems(data);
      } catch {
        // ignore list refresh errors during polling
      }
    }
  }

  function stopNotifPolling() {
    if (notifPollRef.current) window.clearInterval(notifPollRef.current);
    notifPollRef.current = null;

    if (notifBurstTimeoutRef.current)
      window.clearTimeout(notifBurstTimeoutRef.current);
    notifBurstTimeoutRef.current = null;
  }

  function startNotifPolling(mode: "idle" | "open" | "burst") {
    stopNotifPolling();

    const ms = mode === "open" ? 8000 : mode === "burst" ? 5000 : 30000;

    notifPollRef.current = window.setInterval(() => {
      refreshNotifications({ includeList: isNotifOpen }).catch(() => {});
    }, ms);

    // Auto-stop burst quickly
    if (mode === "burst") {
      notifBurstTimeoutRef.current = window.setTimeout(() => {
        startNotifPolling(isNotifOpen ? "open" : "idle");
      }, 8000);
    }
  }

  React.useEffect(() => {
    if (!user?.id) return;

    // Fire-and-forget so it can't delay initial renders
    refreshNotifications({ includeList: false }).catch(() => {});
    startNotifPolling("idle");

    return () => {
      stopNotifPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  React.useEffect(() => {
    const onRefresh = () => {
      refreshNotifications({ includeList: isNotifOpen }).catch(() => {});
      startNotifPolling("burst");
    };

    window.addEventListener("notifications:refresh", onRefresh);
    return () => window.removeEventListener("notifications:refresh", onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNotifOpen]);

  const fullName: string = user?.full_name || "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="relative z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sky-500 text-sm font-semibold text-white">
            {initials || "U"}
          </span>

          <span className="text-sm font-semibold tracking-tight text-slate-900">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setIsNotifOpen((v) => {
                const next = !v;

                if (next) {
                  loadNotifDropdown();
                  startNotifPolling("open");
                } else {
                  startNotifPolling("idle");
                }

                return next;
              });
            }}
            className="relative rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            aria-haspopup="menu"
            aria-expanded={isNotifOpen}
          >
            <BellRing className="h-5 w-5" />
            {notifUnread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                {notifUnread > 99 ? "99+" : notifUnread}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-6 top-14 w-72 rounded-md border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-700">
                  Inbox
                </div>
                {notifLoading ? (
                  <InlineSpinner className="h-3 w-3 border-2" />
                ) : null}
              </div>

              <div className="max-h-56 overflow-auto px-3 py-2 text-xs text-slate-600">
                {notifError ? (
                  <div className="py-4 text-rose-700">{notifError}</div>
                ) : notifItems.length === 0 && notifLoading ? (
                  <div className="py-2">
                    <SkeletonList rows={4} rowClassName="h-10 rounded-md" />
                  </div>
                ) : notifItems.length === 0 ? (
                  <div className="py-4 text-slate-500">Inbox is empty.</div>
                ) : (
                  <div className="space-y-2">
                    {notifItems.map((n) => {
                      const isUnread = !n.read_at;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={[
                            "w-full rounded-md border px-3 py-2 text-left transition",
                            isUnread
                              ? "border-sky-200 bg-sky-50 hover:bg-sky-100"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}
                          onClick={async () => {
                            try {
                              if (!n.read_at) await markNotificationRead(n.id);
                              await refreshNotifBadge();
                              setIsNotifOpen(false);
                              startNotifPolling("burst");

                              const noLink = Boolean((n as any)?.meta?.no_link);

                              // Rule: if access was removed, do NOT navigate anywhere
                              if (noLink) return;

                              if (n.document_id)
                                navigate(`/documents/${n.document_id}`);
                              else navigate("/inbox");
                            } catch {
                              // ignore
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div
                                className={[
                                  "truncate text-xs font-semibold",
                                  isUnread
                                    ? "text-slate-900"
                                    : "text-slate-700",
                                ].join(" ")}
                              >
                                {n.title}
                              </div>
                              {n.body ? (
                                <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                                  {n.body}
                                </div>
                              ) : null}
                            </div>
                            {isUnread ? (
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
                <button
                  type="button"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  onClick={async () => {
                    try {
                      await markAllNotificationsRead();
                      await loadNotifDropdown();
                      startNotifPolling("burst");
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Mark all as read
                </button>

                <button
                  type="button"
                  className="text-xs font-medium text-sky-700 hover:text-sky-900"
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate("/inbox");
                  }}
                >
                  View all
                </button>
              </div>
            </div>
          )}

          <span className="text-xs text-slate-600">
            {user?.full_name ?? ""}
          </span>

          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
