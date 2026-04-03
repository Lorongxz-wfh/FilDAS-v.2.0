import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthUser } from "../hooks/useAuthUser";
import { getUserRole, isQA } from "../lib/roleFilters";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import RefreshButton from "../components/ui/RefreshButton";
import ReportFilters from "../components/reports/ReportFilters";
import { useReportsData } from "../hooks/useReportsData";
import { useReportFilters } from "../hooks/useReportFilters";
import { getOffices } from "../services/reportsApi";
import { SlidersHorizontal, TrendingUp } from "lucide-react";
import { tabCls } from "../utils/formStyles";

// Tabs
import OverviewTab from "../components/reports/tabs/OverviewTab";
import WorkflowTab from "../components/reports/tabs/WorkflowTab";
import RequestsTab from "../components/reports/tabs/RequestsTab";
import ActivityTab from "../components/reports/tabs/ActivityTab";
import UsersTab from "../components/reports/tabs/UsersTab";

type Tab = "overview" | "workflow" | "requests" | "activity" | "users";

const TABS_QA: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "workflow", label: "Workflow" },
  { key: "requests", label: "Requests" },
  { key: "activity", label: "Activity" },
];

const TABS_OFFICE_HEAD: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "workflow", label: "Workflow" },
];

const TABS_ADMIN: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "requests", label: "Requests" },
  { key: "activity", label: "Activity" },
];

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const me = useAuthUser();
  const role = getUserRole();
  const qaMode = isQA(role);
  const isOfficeHead = role === "OFFICE_HEAD";
  const TABS = qaMode ? TABS_QA : isOfficeHead ? TABS_OFFICE_HEAD : TABS_ADMIN;

  const tabContentRef = React.useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>("overview");
  const [officesList, setOfficesList] = React.useState<{ id: number; name: string; code: string }[]>([]);

  // ── Filter state hook ────────────────────────────────────────────────────────
  const {
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    bucket, setBucket,
    parent, setParent,
    dateField, setDateField,
    scope, setScope,
    officeId, setOfficeId,
    activeFilterCount,
    clearAllFilters
  } = useReportFilters({ isOfficeHead });

  React.useEffect(() => {
    getOffices()
      .then(setOfficesList)
      .catch(() => {});
  }, []);

  // ── Data hook ────────────────────────────────────────────────────────────────
  const {
    loading,
    requestsLoading,
    activityLoading,
    adminUserLoading,
    stats,
    requestsReport,
    activityReport,
    adminUserStats,
    ongoingCount,
  } = useReportsData({
    me,
    role,
    qaMode,
    isOfficeHead,
    activeTab,
    refreshKey,
    filters: {
      dateFrom,
      dateTo,
      bucket,
      parent,
      officeId,
      dateField,
      scope,
    },
  });

  React.useEffect(() => {
    // Trigger window resize to help Recharts components expand/shrink when sidebar toggles
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 320);
    return () => clearTimeout(timer);
  }, [filtersOpen]);

  if (!me) return <Navigate to="/login" replace />;

  return (
    <PageFrame
      title="Reports"
      contentClassName="flex flex-col min-h-0 gap-0 h-full overflow-hidden"
      right={
        <div className="flex items-center gap-2">
          <RefreshButton
            loading={loading}
            onRefresh={async () => {
              setRefreshKey((k) => k + 1);
              return "Report data refreshed.";
            }}
            title="Refresh report"
          />

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate("/reports/export")}
            title="Export reports"
          >
            <TrendingUp size={15} />
            <span className="hidden sm:inline font-bold">Export reports</span>
          </Button>
        </div>
      }
    >
      {/* Tab nav */}
      <div className="shrink-0 flex items-center border-b border-slate-200 dark:border-surface-400 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={tabCls(activeTab === t.key) + " whitespace-nowrap"}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center pr-3 -mb-px">
          <Button
            type="button"
            variant={filtersOpen ? "primary" : "outline"}
            size="xs"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal size={12} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${filtersOpen ? "bg-white text-brand-600" : "bg-brand-500 text-white"}`}>
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Content + filter panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div ref={tabContentRef} className="flex-1 min-w-0 overflow-y-auto">
          <div className="flex flex-col gap-5 p-4 sm:p-5">
            {activeTab === "overview" && (
              <OverviewTab
                loading={loading}
                activityLoading={activityLoading}
                qaMode={qaMode}
                role={role}
                bucket={bucket}
                stats={stats}
                ongoingCount={ongoingCount}
                activityReport={activityReport}
              />
            )}

            {activeTab === "workflow" && (qaMode || isOfficeHead) && (
              <WorkflowTab
                loading={loading}
                bucket={bucket}
                stats={stats}
                ongoingCount={ongoingCount}
              />
            )}

            {activeTab === "requests" && (
              <RequestsTab
                requestsLoading={requestsLoading}
                requestsReport={requestsReport}
                bucket={bucket}
              />
            )}

            {activeTab === "activity" && (
              <ActivityTab
                activityLoading={activityLoading}
                activityReport={activityReport}
              />
            )}

            {activeTab === "users" && (role === "ADMIN" || role === "SYSADMIN") && (
              <UsersTab
                adminUserLoading={adminUserLoading}
                adminUserStats={adminUserStats}
              />
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {filtersOpen && (
          <div className="w-72 shrink-0 border-l border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 overflow-y-auto hidden lg:block">
            <ReportFilters
              isOfficeHead={isOfficeHead}
              me={me}
              activeFilterCount={activeFilterCount}
              officesList={officesList}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              bucket={bucket}
              setBucket={setBucket}
              parent={parent}
              setParent={setParent}
              officeId={officeId}
              setOfficeId={setOfficeId}
              dateField={dateField}
              setDateField={setDateField}
              scope={scope}
              setScope={setScope}
              onClear={clearAllFilters}
            />
          </div>
        )}
      </div>

      {/* Mobile filter slide-over (simplified) */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="relative w-full max-w-xs bg-white dark:bg-surface-500 h-full overflow-y-auto">
             <div className="p-4 border-b border-slate-200 dark:border-surface-400 flex items-center justify-between">
                <h3 className="font-bold text-sm">Filters</h3>
                <button onClick={() => setFiltersOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
             </div>
             <ReportFilters
              isOfficeHead={isOfficeHead}
              me={me}
              activeFilterCount={activeFilterCount}
              officesList={officesList}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              bucket={bucket}
              setBucket={setBucket}
              parent={parent}
              setParent={setParent}
              officeId={officeId}
              setOfficeId={setOfficeId}
              dateField={dateField}
              setDateField={setDateField}
              scope={scope}
              setScope={setScope}
              onClear={clearAllFilters}
            />
          </div>
        </div>
      )}
    </PageFrame>
  );
};

export default ReportsPage;
