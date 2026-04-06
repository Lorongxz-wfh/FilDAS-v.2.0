import { useState, useEffect, useCallback, useRef } from "react";
import { getUnreadNotificationCount, getWorkQueue } from "../services/documents";
import { listDocumentRequests, listDocumentRequestInbox } from "../services/documentRequests";
import { getUserRole, isQA } from "../lib/roleFilters";
import { useRealtimeUpdates } from "./useRealtimeUpdates";

export type NavStats = {
  notifications: number;
  workflows: number;
  requests: number;
  total: number;
};

export function useGlobalNavStats() {
  const [stats, setStats] = useState<NavStats>({
    notifications: 0,
    workflows: 0,
    requests: 0,
    total: 0,
  });

  const role = getUserRole();
  const lastFetchRef = useRef(0);

  const fetchStats = useCallback(async () => {
    try {
      const [notifCount, queueRes, reqRes] = await Promise.all([
        getUnreadNotificationCount(),
        getWorkQueue(),
        isQA(role) 
          ? listDocumentRequests({ per_page: 1, request_status: "open" }) 
          : listDocumentRequestInbox({ per_page: 1 }),
      ]);

      const workflows = queueRes?.assigned?.length ?? 0;
      const requests = reqRes?.meta?.total ?? 0;
      
      const newStats = {
        notifications: notifCount,
        workflows,
        requests,
        total: notifCount + workflows + requests,
      };

      setStats(newStats);
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error("Failed to fetch global nav stats:", err);
    }
  }, [role]);

  useEffect(() => {
    fetchStats();
    // Aggressive polling: 30 seconds
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Real-time updates
  useRealtimeUpdates({
    onNotification: () => fetchStats(),
    onWorkflowUpdate: () => fetchStats(),
    onWorkspaceChange: () => fetchStats(),
  });

  // Also listen for a custom refresh event that notification bell might trigger
  useEffect(() => {
    const handleRefresh = () => fetchStats();
    window.addEventListener("notifications:refresh", handleRefresh);
    window.addEventListener("page:remote-refresh", handleRefresh);
    return () => {
      window.removeEventListener("notifications:refresh", handleRefresh);
      window.removeEventListener("page:remote-refresh", handleRefresh);
    };
  }, [fetchStats]);

  return stats;
}
