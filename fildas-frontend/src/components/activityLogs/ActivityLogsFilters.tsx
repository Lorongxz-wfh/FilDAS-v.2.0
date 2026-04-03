import React from "react";
import { selectCls } from "../../utils/formStyles";
import DateRangeInput from "../ui/DateRangeInput";
import type { ActivityLogsParams, Scope, Category } from "../../hooks/useActivityLogs";
import SearchFilterBar from "../ui/SearchFilterBar";

interface Props {
  params: ActivityLogsParams;
  updateParams: (updates: Partial<ActivityLogsParams>) => void;
  isOfficeHead: boolean;
  officeName?: string;
  onClear: () => void;
}

const ActivityLogsFilters: React.FC<Props> = ({
  params,
  updateParams,
  isOfficeHead,
  officeName,
  onClear,
}) => {
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (params.scope !== "all") count++;
    if (params.category) count++;
    if (params.dateFrom) count++;
    if (params.dateTo) count++;
    return count;
  }, [params.scope, params.category, params.dateFrom, params.dateTo]);

  return (
    <SearchFilterBar
      search={params.q}
      setSearch={(val) => updateParams({ q: val })}
      placeholder="Search event / label…"
      activeFiltersCount={activeFiltersCount}
      onClear={onClear}
      mobileFilters={
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Scope</label>
              {isOfficeHead ? (
                <div className="px-3 h-9 rounded-md border border-slate-200 dark:border-surface-400 bg-slate-100 dark:bg-surface-500 opacity-60 flex items-center justify-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Office scoped
                </div>
              ) : (
                <select
                  value={params.scope}
                  onChange={(e) => updateParams({ scope: e.target.value as Scope })}
                  className={selectCls}
                >
                  <option value="all">All</option>
                  <option value="office">My office</option>
                  <option value="mine">Mine</option>
                </select>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Category</label>
              <select
                value={params.category}
                onChange={(e) => updateParams({ category: e.target.value as Category })}
                className={selectCls}
              >
                <option value="">All categories</option>
                <option value="workflow">Workflow</option>
                <option value="request">Document Requests</option>
                <option value="document">Documents</option>
                <option value="user">User Management</option>
                <option value="template">Templates</option>
                <option value="profile">Profile & Auth</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Date Range</label>
            <DateRangeInput
              from={params.dateFrom}
              to={params.dateTo}
              onFromChange={(val) => updateParams({ dateFrom: val })}
              onToChange={(val) => updateParams({ dateTo: val })}
            />
          </div>
        </div>
      }
    >
      {!isOfficeHead ? (
        <select
          value={params.scope}
          onChange={(e) => updateParams({ scope: e.target.value as Scope })}
          className={`${selectCls} text-xs h-8 w-24`}
        >
          <option value="all">All</option>
          <option value="office">My office</option>
          <option value="mine">Mine</option>
        </select>
      ) : (
        <span className="inline-flex items-center rounded-md border border-slate-200 dark:border-surface-400 bg-slate-50 dark:bg-surface-600 px-3 h-8 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {officeName || "Your office"}
        </span>
      )}

      <select
        value={params.category}
        onChange={(e) => updateParams({ category: e.target.value as Category })}
        className={`${selectCls} text-xs h-8 w-36`}
      >
        <option value="">All categories</option>
        <option value="workflow">Workflow</option>
        <option value="request">Document Requests</option>
        <option value="document">Documents</option>
        <option value="user">User Management</option>
        <option value="template">Templates</option>
        <option value="profile">Profile & Auth</option>
      </select>

      <DateRangeInput
        from={params.dateFrom}
        to={params.dateTo}
        onFromChange={(val) => updateParams({ dateFrom: val })}
        onToChange={(val) => updateParams({ dateTo: val })}
      />
    </SearchFilterBar>
  );
};

export default ActivityLogsFilters;
