import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthUser } from "../lib/auth";
import {
  listWorkflowTasks,
  getAvailableActions,
  submitWorkflowAction,
  listDocumentMessages,
  listActivityLogs,
  type WorkflowTask,
  type WorkflowActionCode,
  type DocumentMessage,
  type ActivityLogItem,
} from "../services/documents";

type Options = {
  versionId: number;
  activeSideTab: "comments" | "logs";
  onChanged?: () => Promise<void> | void;
  onAfterActionClose?: () => void;
  myOfficeId: number | null;
  qaOfficeId: number | null;
};

export function useDocumentWorkflow({
  versionId,
  activeSideTab,
  onChanged,
  onAfterActionClose,
  myOfficeId,
  qaOfficeId,
}: Options) {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [availableActions, setAvailableActions] = useState<
    WorkflowActionCode[]
  >([]);
  const [isTasksReady, setIsTasksReady] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const [messages, setMessages] = useState<DocumentMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [isLoadingActivityLogs, setIsLoadingActivityLogs] = useState(false);

  const [isBurstPolling, setIsBurstPolling] = useState(false);
  const burstPollRef = useRef<number | null>(null);
  const burstTimeoutRef = useRef<number | null>(null);

  // Change detection
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [taskChanged, setTaskChanged] = useState(false);
  const prevMessageCountRef = useRef<number>(0);
  const prevOpenTaskOfficeRef = useRef<number | null>(null);
  const prevActionsRef = useRef<string>("");
  const isFirstTaskLoadRef = useRef(true);
  const isFirstMessageLoadRef = useRef(true);
  const myUserIdRef = useRef<number | null>(null);

  // Keep myUserId in a ref for use inside intervals
  useEffect(() => {
    myUserIdRef.current = getAuthUser()?.id ?? null;
  }, []);

  const idlePollRef = useRef<number | null>(null);

  const stopAllPolling = useCallback(() => {
    setIsBurstPolling(false);
    if (burstPollRef.current) window.clearInterval(burstPollRef.current);
    burstPollRef.current = null;
    if (burstTimeoutRef.current) window.clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = null;
    if (idlePollRef.current) window.clearInterval(idlePollRef.current);
    idlePollRef.current = null;
  }, []);

  // Keep old name as alias so existing call sites don't break
  const stopBurstPolling = stopAllPolling;

  const refreshTasksAndActions = useCallback(async (id: number) => {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const [t, actions] = await Promise.all([
        listWorkflowTasks(id),
        getAvailableActions(id),
      ]);
      setTasks(t);
      setAvailableActions(actions);

      // Change detection — skip on first load
      if (!isFirstTaskLoadRef.current) {
        const openTask = t.find((tk) => tk.status === "open") ?? null;
        const newOffice = openTask?.assigned_office_id ?? null;
        const newActionsKey = actions.join(",");
        if (
          newOffice !== prevOpenTaskOfficeRef.current ||
          newActionsKey !== prevActionsRef.current
        ) {
          setTaskChanged(true);
        }
      } else {
        isFirstTaskLoadRef.current = false;
      }

      // Update refs
      const openTask = t.find((tk) => tk.status === "open") ?? null;
      prevOpenTaskOfficeRef.current = openTask?.assigned_office_id ?? null;
      prevActionsRef.current = actions.join(",");
    } catch {
      setTasks([]);
      setAvailableActions([]);
    } finally {
      setIsTasksReady(true);
    }
  }, []);

  const startIdlePolling = useCallback(
    (id: number) => {
      if (idlePollRef.current) window.clearInterval(idlePollRef.current);
      idlePollRef.current = window.setInterval(() => {
        refreshTasksAndActions(id).catch(() => {});
      }, 10_000);
    },
    [refreshTasksAndActions],
  );

  const startBurstPolling = useCallback(
    (id: number) => {
      // Stop idle, start burst
      if (idlePollRef.current) window.clearInterval(idlePollRef.current);
      idlePollRef.current = null;
      if (burstPollRef.current) window.clearInterval(burstPollRef.current);

      setIsBurstPolling(true);
      burstPollRef.current = window.setInterval(() => {
        refreshTasksAndActions(id).catch(() => {});
      }, 5_000);

      // After 15s revert to idle
      if (burstTimeoutRef.current) window.clearTimeout(burstTimeoutRef.current);
      burstTimeoutRef.current = window.setTimeout(() => {
        if (burstPollRef.current) window.clearInterval(burstPollRef.current);
        burstPollRef.current = null;
        setIsBurstPolling(false);
        startIdlePolling(id);
      }, 15_000);
    },
    [refreshTasksAndActions, startIdlePolling],
  );

  // Initial load
  useEffect(() => {
    let alive = true;
    setIsTasksReady(false);
    setAvailableActions([]);

    (async () => {
      try {
        const [t, actions] = await Promise.all([
          listWorkflowTasks(versionId),
          getAvailableActions(versionId),
        ]);
        if (!alive) return;
        setTasks(t);
        setAvailableActions(actions);
      } catch {
        if (!alive) return;
        setTasks([]);
        setAvailableActions([]);
      } finally {
        if (alive) setIsTasksReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [versionId]);

  // Start idle polling on mount, stop on unmount
  useEffect(() => {
    startIdlePolling(versionId);
    return () => stopAllPolling();
  }, [versionId, startIdlePolling, stopAllPolling]);

  // Poll messages every 10s when comments tab is active
  useEffect(() => {
    if (activeSideTab !== "comments") return;
    const interval = window.setInterval(() => {
      listDocumentMessages(versionId)
        .then((m) => {
          setMessages(m);
          if (!isFirstMessageLoadRef.current) {
            const incoming = m.filter(
              (msg) =>
                Number(msg.sender_user_id) !== Number(myUserIdRef.current),
            );
            const newCount = incoming.length - prevMessageCountRef.current;
            if (newCount > 0) {
              setNewMessageCount((prev) => prev + newCount);
            }
            prevMessageCountRef.current = incoming.length;
          } else {
            isFirstMessageLoadRef.current = false;
            const incoming = m.filter(
              (msg) =>
                Number(msg.sender_user_id) !== Number(myUserIdRef.current),
            );
            prevMessageCountRef.current = incoming.length;
          }
        })
        .catch(() => {});
    }, 10_000);
    return () => {
      window.clearInterval(interval);
      isFirstMessageLoadRef.current = true;
    };
  }, [versionId, activeSideTab]);

  // Messages
  useEffect(() => {
    let alive = true;
    if (activeSideTab !== "comments") {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    listDocumentMessages(versionId)
      .then((m) => {
        if (alive) setMessages(m);
      })
      .catch(() => {
        if (alive) setMessages([]);
      })
      .finally(() => {
        if (alive) setIsLoadingMessages(false);
      });
    return () => {
      alive = false;
    };
  }, [versionId, activeSideTab]);

  // Activity logs
  useEffect(() => {
    let alive = true;
    if (activeSideTab !== "logs") {
      setActivityLogs([]);
      return;
    }
    setIsLoadingActivityLogs(true);
    listActivityLogs({
      scope: "document",
      document_version_id: versionId,
      per_page: 50,
    })
      .then((p) => {
        if (alive) setActivityLogs(p.data);
      })
      .catch(() => {
        if (alive) setActivityLogs([]);
      })
      .finally(() => {
        if (alive) setIsLoadingActivityLogs(false);
      });
    return () => {
      alive = false;
    };
  }, [versionId, activeSideTab]);

  const submitAction = useCallback(
    async (code: WorkflowActionCode, note?: string) => {
      setIsChangingStatus(true);
      try {
        const res = await submitWorkflowAction(versionId, code, note);
        window.dispatchEvent(new Event("notifications:refresh"));
        await refreshTasksAndActions(res.version.id);
        startBurstPolling(res.version.id);

        const [msgs, logs] = await Promise.all([
          activeSideTab === "comments"
            ? listDocumentMessages(res.version.id)
            : Promise.resolve(null),
          activeSideTab === "logs"
            ? listActivityLogs({
                scope: "document",
                document_version_id: res.version.id,
                per_page: 50,
              })
            : Promise.resolve(null),
        ]);

        if (msgs) setMessages(msgs);
        if (logs) setActivityLogs(logs.data);

        if (onChanged) await onChanged();

        if (qaOfficeId && myOfficeId !== qaOfficeId) {
          onAfterActionClose?.();
        }

        return res;
      } finally {
        setIsChangingStatus(false);
      }
    },
    [
      versionId,
      activeSideTab,
      refreshTasksAndActions,
      startBurstPolling,
      onChanged,
      onAfterActionClose,
      myOfficeId,
      qaOfficeId,
    ],
  );

  const refreshMessages = useCallback(async () => {
    const m = await listDocumentMessages(versionId);
    setMessages(m);
  }, [versionId]);

  const clearNewMessageCount = useCallback(() => {
    setNewMessageCount(0);
  }, []);

  const clearTaskChanged = useCallback(() => {
    setTaskChanged(false);
  }, []);

  return {
    tasks,
    setTasks,
    availableActions,
    isTasksReady,
    isChangingStatus,
    messages,
    setMessages,
    isLoadingMessages,
    activityLogs,
    isLoadingActivityLogs,
    isBurstPolling,
    stopBurstPolling,
    submitAction,
    refreshMessages,
    refreshTasksAndActions,
    newMessageCount,
    clearNewMessageCount,
    taskChanged,
    clearTaskChanged,
  };
}
