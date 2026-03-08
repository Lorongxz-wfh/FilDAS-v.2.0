import { useCallback, useEffect, useRef, useState } from "react";
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

  const stopBurstPolling = useCallback(() => {
    setIsBurstPolling(false);
    if (burstPollRef.current) window.clearInterval(burstPollRef.current);
    burstPollRef.current = null;
    if (burstTimeoutRef.current) window.clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = null;
  }, []);

  const refreshTasksAndActions = useCallback(async (id: number) => {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const [t, actions] = await Promise.all([
        listWorkflowTasks(id),
        getAvailableActions(id),
      ]);
      setTasks(t);
      setAvailableActions(actions);
    } catch {
      setTasks([]);
      setAvailableActions([]);
    } finally {
      setIsTasksReady(true);
    }
  }, []);

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
  };
}
