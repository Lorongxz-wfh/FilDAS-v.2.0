import { useCallback, useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { pageCache } from "../lib/pageCache";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Table, { type TableColumn } from "../components/ui/Table";
import { getAdminOffices, type AdminOffice } from "../services/admin";
import OfficeEditModal from "../components/admin/OfficeEditModal";
import Alert from "../components/ui/Alert";
import { inputCls, selectCls } from "../utils/formStyles";
import { X, Search, SlidersHorizontal } from "lucide-react";
import RefreshButton from "../components/ui/RefreshButton";
import MiddleTruncate from "../components/ui/MiddleTruncate";
import { formatDate } from "../utils/formatters";
import { StatusBadge } from "../components/ui/Badge";

const OFFICE_TYPES = ["office", "vp", "president", "committee", "unit"];

export function OfficeManagerPage() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "disabled" | "all"
  >("active");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "code" | "type">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [reloadTick, setReloadTick] = useState(0);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "active") count++;
    if (typeFilter) count++;
    return count;
  }, [statusFilter, typeFilter]);

  const _oc = pageCache.get<AdminOffice>("offices", '{"q":"","status":"active","type":""}', 10 * 60_000);
  const [items, setItems] = useState<AdminOffice[]>(_oc?.rows ?? []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(_oc?.hasMore ?? true);
  const [loading, setLoading] = useState(!_oc);
  const [initialLoading, setInitialLoading] = useState(!_oc);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(
    () => (location.state as any)?.openModal === true,
  );
  const [modalMode, setModalMode] = useState<"create" | "edit">(() =>
    (location.state as any)?.openModal === true ? "create" : "edit",
  );
  const [selected, setSelected] = useState<AdminOffice | null>(null);

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (pageNum: number) => {
      const filterKey = JSON.stringify({
        q: qDebounced.trim(),
        status: statusFilter,
        type: typeFilter,
      });
      try {
        setLoading(true);
        setError(null);
        const res = await getAdminOffices({
          q: qDebounced.trim() || undefined,
          status: statusFilter,
          type: typeFilter || undefined,
          page: pageNum,
          per_page: 10,
          sort_by: sortBy,
          sort_dir: sortDir,
        });
        const more = res.meta.current_page < res.meta.last_page;
        setItems((prev) => (pageNum === 1 ? res.data : [...prev, ...res.data]));
        setHasMore(more);
        if (pageNum === 1) pageCache.set("offices", filterKey, res.data, more);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load offices");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [qDebounced, statusFilter, typeFilter, sortBy, sortDir, reloadTick],
  );

  // Reset on filter change
  useEffect(() => {
    setPage(1);
    setItems([]);
    setHasMore(true);
    setInitialLoading(true);
    load(1);
  }, [load]);

  // Load next page when page increments beyond 1
  useEffect(() => {
    if (page === 1) return;
    load(page);
  }, [page, load]);

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
    setModalOpen(true);
  };
  const openEdit = (office: AdminOffice) => {
    setSelected(office);
    setModalMode("edit");
    setModalOpen(true);
  };

  const hasActiveFilters = !!q || statusFilter !== "active" || !!typeFilter;
  const clearFilters = () => {
    setQ("");
    setStatusFilter("active");
    setTypeFilter("");
  };

  const columns: TableColumn<AdminOffice>[] = useMemo(() => [
    {
      key: "code",
      header: "Code",
      sortKey: "code",
      skeletonShape: "narrow",
      render: (o) => (
        <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
          {o.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortKey: "name",
      skeletonShape: "text",
      render: (o) => (
        <MiddleTruncate 
          text={o.name}
          className="font-semibold text-slate-900 dark:text-slate-100 placeholder:block"
        />
      ),
    },
    {
      key: "parent",
      header: "Parent",
      skeletonShape: "text",
      render: (o) => {
        const text = o.parent_office 
          ? `${o.parent_office.name} (${o.parent_office.code})` 
          : "—";
        return (
          <MiddleTruncate 
            text={text}
            className="text-sm text-slate-600 dark:text-slate-400"
          />
        );
      },
    },
    {
      key: "type",
      header: "Type",
      skeletonShape: "narrow",
      render: (o) => {
        const raw = o.type ?? "office";
        const label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        return (
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {label}
          </span>
        );
      }
    },
    {
      key: "status",
      header: "Status",
      skeletonShape: "badge",
      render: (o) => <StatusBadge status={o.deleted_at ? "Disabled" : "Active"} />,
    },
    {
      key: "created",
      header: "Created",
      skeletonShape: "narrow",
      render: (o) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {(o as any).created_at ? formatDate((o as any).created_at) : "—"}
        </span>
      ),
    },
  ], []);

  return (
    <PageFrame
      title="Office Manager"
      contentClassName="flex flex-col min-h-0 h-full"
      right={
        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={() => setReloadTick((t) => t + 1)}
            loading={loading || initialLoading}
            title="Refresh offices"
          />
          <Button type="button" variant="primary" size="sm" onClick={openCreate}>
            New office
          </Button>
        </div>
      }
    >
      {/* Filter bar - updated for mobile responsiveness */}
      <div className="shrink-0 py-3 flex flex-col gap-3 sm:gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or code…"
              className={`${inputCls} pl-9 pr-8 text-sm`}
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`sm:hidden flex items-center gap-2 px-3 h-9 rounded-lg border transition-all ${
              isFiltersOpen || activeFiltersCount > 0
                ? "bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 dark:bg-surface-500 dark:border-surface-400 dark:text-slate-400"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-brand-500 text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`${selectCls} text-xs h-8 w-28`}
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="all">All</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`${selectCls} text-xs h-8 w-32`}
            >
              <option value="">All types</option>
              {OFFICE_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary filters collapsible */}
        {isFiltersOpen && (
          <div className="sm:hidden flex flex-col gap-3 p-4 bg-slate-50 dark:bg-surface-600 rounded-xl border border-slate-200 dark:border-surface-400 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className={selectCls}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={selectCls}
                >
                  <option value="">All types</option>
                  {OFFICE_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full py-2.5 text-xs font-bold text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-500/10 rounded-lg transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 overflow-hidden">
        <Table<AdminOffice>
          bare
          className="h-full"
          columns={columns}
          rows={items}
          rowKey={(o) => o.id}
          onRowClick={openEdit}
          loading={loading}
          initialLoading={initialLoading}
          error={error}
          emptyMessage="No offices found."
          hasMore={hasMore}
          onLoadMore={() => setPage((p) => p + 1)}
          gridTemplateColumns="minmax(80px, 6rem) minmax(140px, 1.2fr) minmax(140px, 1.2fr) 8rem 7rem 8rem"
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key as typeof sortBy);
            setSortDir(dir);
          }}
        />
      </div>

      <OfficeEditModal
        open={modalOpen}
        mode={modalMode}
        office={selected}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setPage(1);
          setItems([]);
          setHasMore(true);
          setInitialLoading(true);
          load(1);
        }}
      />
    </PageFrame>
  );
}

export default OfficeManagerPage;
