import { useState, useEffect, useCallback, useRef } from "react";
import {
  getDocumentStats,
  getWorkQueue,
  listActivityLogs,
  getComplianceReport,
  getAdminDashboardStats,
  type DocumentStats,
  type WorkQueueItem,
  type ActivityLogItem,
  type ComplianceReportResponse as ComplianceReport,
  type AdminDashboardStats,
} from "../services/documents";
import {
  listDocumentRequests,
  listDocumentRequestInbox,
} from "../services/documentRequests";
import { isQA, isAuditor, type UserRole } from "../lib/roleFilters";
import type { PendingAction } from "../services/types";
import { useRealtimeUpdates } from "./useRealtimeUpdates";

const emptyReport: ComplianceReport = {
  clusters: [],
  offices: [],
  series: [],
  volume_series: [],
  kpis: {
    total_created: 0,
    total_approved_final: 0,
    first_pass_yield_pct: 0,
    pingpong_ratio: 0,
    cycle_time_avg_days: 0,
  },
  stage_delays: [],
};

export type ReloadResult = { changed: boolean; delta: number };

export type DashboardPeriod = "today" | "this_week" | "all";

export type DashboardData = {
  stats: DocumentStats | null;
  pending: WorkQueueItem[];
  monitoring: WorkQueueItem[];
  recentActivity: ActivityLogItem[];
  report: ComplianceReport;
  adminStats: AdminDashboardStats | null;
  pendingRequestsCount: number;
  pendingRequestsInboxCount: number;
  pendingActions: PendingAction[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<ReloadResult>;
  period: DashboardPeriod;
  setPeriod: (p: DashboardPeriod) => void;
};

export function useDashboardData(role: UserRole): DashboardData {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [pending, setPending] = useState<WorkQueueItem[]>([]);
  const [monitoring, setMonitoring] = useState<WorkQueueItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLogItem[]>([]);
  const [report, setReport] = useState<ComplianceReport>(emptyReport);
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>("this_week");

  // Tracks latest fetched pending count so reload() can detect changes
  const lastPendingCountRef = useRef(-1);

  const isAdmin = role === "ADMIN" || role === "SYSADMIN";
  const [pendingRequestsInboxCount, setPendingRequestsInboxCount] = useState(0);

  const loadRef = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      const now = new Date();

      if (period === "today") {
        dateFrom = now.toISOString().split("T")[0];
        dateTo = dateFrom;
      } else if (period === "this_week") {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        const monday = new Date(d.setDate(diff));
        dateFrom = monday.toISOString().split("T")[0];
        dateTo = now.toISOString().split("T")[0];
      }

      try {
        if (isAdmin) {
          const promises: Promise<any>[] = [
            getAdminDashboardStats({ 
              date_from: dateFrom,
              date_to: dateTo
            })
          ];

          // Heavy activity fetch only on initial load or manual refresh
          if (!silent) {
            promises.push(listActivityLogs({ 
              scope: "all", 
              per_page: 5, // Reduced from 8 to further shrink payload
              date_from: dateFrom,
              date_to: dateTo
            }));
          }

          const results = await Promise.allSettled(promises);
          const adminRes = results[0] as PromiseSettledResult<AdminDashboardStats>;
          const activityRes = results[1] as PromiseSettledResult<any> | undefined;

          if (adminRes.status === "fulfilled") setAdminStats(adminRes.value);
          if (activityRes?.status === "fulfilled")
            setRecentActivity(activityRes.value.data ?? []);

          const firstErr = results.find(
            (r) => r.status === "rejected",
          ) as PromiseRejectedResult | undefined;
          if (firstErr && !silent)
            setError(
              firstErr.reason instanceof Error
                ? firstErr.reason.message
                : "Failed to load stats",
            );
        } else if (isQA(role)) {
          const promises = [
              getDocumentStats({ date_from: dateFrom, date_to: dateTo }),
              getWorkQueue(),
              getComplianceReport({ 
                date_from: dateFrom, 
                date_to: dateTo,
                bucket: period === "this_week" ? "daily" : period === "today" ? "daily" : "monthly"
              }),
              listDocumentRequests({ 
                per_page: 1,
                date_from: dateFrom,
                date_to: dateTo
              }),
          ];

          if (!silent) {
            promises.push(listActivityLogs({ 
              scope: "all", 
              per_page: 5,
              category: "workflow",
              date_from: dateFrom,
              date_to: dateTo
            }));
          }

          const results = await Promise.allSettled(promises);
          const statsRes = results[0] as PromiseSettledResult<DocumentStats>;
          const queueRes = results[1] as PromiseSettledResult<any>;
          const reportRes = results[2] as PromiseSettledResult<any>;
          const reqRes = results[3] as PromiseSettledResult<any>;
          const activityRes = results[4] as PromiseSettledResult<any> | undefined;

          if (statsRes.status === "fulfilled") setStats(statsRes.value);
          if (queueRes.status === "fulfilled") {
            const assigned = queueRes.value.assigned ?? [];
            setPending(assigned);
            setMonitoring(queueRes.value.monitoring ?? []);
            lastPendingCountRef.current = assigned.length;
          }
          if (activityRes?.status === "fulfilled")
            setRecentActivity(activityRes.value.data ?? []);
          if (reportRes.status === "fulfilled") setReport(reportRes.value);
          if (reqRes.status === "fulfilled") {
            const total = reqRes.value?.meta?.total ?? 0;
            setPendingRequestsCount(total);

            // For QA dashboard "Pending actions"
            const docs = (queueRes.status === "fulfilled" ? queueRes.value.assigned : []).map(
              (x: any) =>
                ({
                  type: "document",
                  id: x.version.id,
                  title: x.document.title,
                  code: x.document.code || (x.document as any).reserved_code,
                  status: x.version.status,
                  item: x,
                } as PendingAction),
            );

            // Global requests (if any)
            const reqs = (reqRes.value?.data ?? [])
              .filter((r: any) => r.status === "open")
              .map(
                (r: any) =>
                  ({
                    type: "request",
                    id: r.id,
                    title: r.title,
                    code: `Request #${r.id}`,
                    status: "Open",
                    item: r,
                  } as PendingAction),
              );

            setPendingActions([...docs, ...reqs]);
          }
          
          const firstErr = results.slice(0, 3).find(
            (r) => r.status === "rejected",
          ) as PromiseRejectedResult | undefined;
          if (firstErr && !silent)
            setError(
              firstErr.reason instanceof Error
                ? firstErr.reason.message
                : "Failed to load dashboard components",
            );
        } else if (isAuditor(role)) {
          const promises: Promise<any>[] = [getDocumentStats({ date_from: dateFrom, date_to: dateTo })];
          if (!silent) promises.push(listActivityLogs({ scope: "all", per_page: 5, date_from: dateFrom, date_to: dateTo }));
          
          const results = await Promise.allSettled(promises);
          const statsRes = results[0] as PromiseSettledResult<DocumentStats>;
          const activityRes = results[1] as PromiseSettledResult<any> | undefined;

          if (statsRes.status === "fulfilled") setStats(statsRes.value);
          if (activityRes?.status === "fulfilled") {
            setRecentActivity(activityRes.value.data ?? []);
          }
        } else {
          const promises = [
              getDocumentStats({ date_from: dateFrom, date_to: dateTo }),
              getWorkQueue(),
              listDocumentRequestInbox({ 
                per_page: 5,
                date_from: dateFrom,
                date_to: dateTo
              }),
          ];

          if (!silent) {
            promises.push(listActivityLogs({ 
              scope: "office", 
              per_page: 5,
              date_from: dateFrom,
              date_to: dateTo
            }));
          }

          const results = await Promise.allSettled(promises);
          const statsRes = results[0] as PromiseSettledResult<DocumentStats>;
          const queueRes = results[1] as PromiseSettledResult<any>;
          const inboxRes = results[2] as PromiseSettledResult<any>;
          const activityRes = results[3] as PromiseSettledResult<any> | undefined;

          if (statsRes.status === "fulfilled") setStats(statsRes.value);
          if (queueRes.status === "fulfilled") {
            const assigned = queueRes.value.assigned ?? [];
            setPending(assigned);
            setMonitoring(queueRes.value.monitoring ?? []);
            lastPendingCountRef.current = assigned.length;
          }
          if (activityRes?.status === "fulfilled")
            setRecentActivity(activityRes.value.data ?? []);
          if (inboxRes.status === "fulfilled") {
            const total = inboxRes.value?.meta?.total ?? 0;
            setPendingRequestsInboxCount(total);

            const docs = (queueRes.status === "fulfilled" ? queueRes.value.assigned : []).map(
              (x: any) =>
                ({
                  type: "document",
                  id: x.version.id,
                  title: x.document.title,
                  code: x.document.code || (x.document as any).reserved_code,
                  status: x.version.status,
                  item: x,
                } as PendingAction),
            );

            const reqs = (inboxRes.value?.data ?? [])
              .filter(
                (r: any) =>
                  r.recipient_status === "pending" ||
                  r.recipient_status === "rejected",
              )
              .map(
                (r: any) =>
                  ({
                    type: "request",
                    id: r.id,
                    title: r.title,
                    code: `Request #${r.id}`,
                    status:
                      r.recipient_status === "pending" ? "Pending" : "Rejected",
                    item: r,
                  } as PendingAction),
              );

            setPendingActions([...docs, ...reqs]);
          }
        }
      } catch (e: unknown) {
        if (!silent) {
          setError(e instanceof Error ? e.message : "Failed to load stats");
        }
      } finally {
        setLoading(false);
      }
    },
    [role, isAdmin, period],
  );

  useEffect(() => {
    loadRef();
    // Keep 60s fallback polling, but real-time will handle most cases
    const interval = window.setInterval(() => loadRef(true), 60_000);
    return () => window.clearInterval(interval);
  }, [loadRef]);

  // ── Real-time Integration ──────────────────────────────────────────────
  useRealtimeUpdates({
    onWorkspaceChange: () => {
      // Trigger a silent reload when any global document/request change occurs
      loadRef(true).catch(() => {});
    },
    onWorkflowUpdate: () => {
      // Trigger a silent reload when a workflow task is assigned to/updated for this user
      loadRef(true).catch(() => {});
    },
  });

  const reload = useCallback(async (): Promise<ReloadResult> => {
    const prev = lastPendingCountRef.current;
    await loadRef(true);
    const next = lastPendingCountRef.current;
    const delta = next - prev;
    return { changed: prev !== -1 && next !== prev, delta };
  }, [loadRef]);

  return {
    stats,
    pending,
    monitoring,
    recentActivity,
    report,
    adminStats,
    pendingRequestsCount,
    pendingRequestsInboxCount,
    pendingActions,
    loading,
    error,
    reload,
    period,
    setPeriod,
  };
}
