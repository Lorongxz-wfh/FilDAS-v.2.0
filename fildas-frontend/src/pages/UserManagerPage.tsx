import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { pageCache } from "../lib/pageCache";
import { getUserRole } from "../lib/roleFilters";
import PageFrame from "../components/layout/PageFrame";
import Table, { type TableColumn } from "../components/ui/Table";
import Button from "../components/ui/Button";
import {
  getAdminUsers,
  getAdminRoles,
  type AdminUser,
  type AdminRole,
} from "../services/admin";
import UserEditModal from "../components/admin/UserEditModal";
import Alert from "../components/ui/Alert";
import { inputCls, selectCls } from "../utils/formStyles";
import { X, Search, SlidersHorizontal } from "lucide-react";
import RefreshButton from "../components/ui/RefreshButton";
import MiddleTruncate from "../components/ui/MiddleTruncate";
import { formatDate } from "../utils/formatters";

const UserManagerPage: React.FC = () => {
  const role = getUserRole();
  const isAdmin = role === "ADMIN" || role === "SYSADMIN";

  const _uc = pageCache.get<AdminUser>(
    "users",
    '{"q":"","status":"","role":""}',
    5 * 60_000,
  );
  const [rows, setRows] = useState<AdminUser[]>(_uc?.rows ?? []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(_uc?.hasMore ?? true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!_uc);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "disabled">(
    "",
  );
  const [roleFilter, setRoleFilter] = useState<number | "">("");
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (roleFilter) count++;
    return count;
  }, [statusFilter, roleFilter]);

  const [reloadTick, setReloadTick] = useState(0);
  const [sortBy, setSortBy] = useState<
    "first_name" | "last_name" | "email" | "created_at"
  >("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const location = useLocation();
  const [isEditOpen, setIsEditOpen] = useState(
    () => (location.state as any)?.openModal === true,
  );
  const [editMode, setEditMode] = useState<"edit" | "create">(() =>
    (location.state as any)?.openModal === true ? "create" : "edit",
  );
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Load roles once
  useEffect(() => {
    getAdminRoles()
      .then(setRoles)
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  // Reset on filter/reload change
  useEffect(() => {
    setRows([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
  }, [searchDebounced, statusFilter, roleFilter, reloadTick, sortBy, sortDir]);

  useEffect(() => {
    let alive = true;
    const filterKey = JSON.stringify({
      q: searchDebounced,
      status: statusFilter,
      role: String(roleFilter),
    });
    const load = async () => {
      if (!hasMore && page > 1) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getAdminUsers({
          page,
          per_page: 10,
          q: searchDebounced || undefined,
          status: statusFilter || undefined,
          role_id: roleFilter || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
        });
        if (!alive) return;
        const incoming = res.data ?? [];
        setRows((prev) => (page === 1 ? incoming : [...prev, ...incoming]));
        const meta = res.meta ?? (res as any);
        const more =
          meta?.current_page != null &&
          meta?.last_page != null &&
          meta.current_page < meta.last_page;
        setHasMore(more);
        if (page === 1) pageCache.set("users", filterKey, incoming, more);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load users.");
      } finally {
        if (!alive) return;
        setLoading(false);
        setInitialLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchDebounced, statusFilter, roleFilter, reloadTick]);

  const openEdit = (u: AdminUser) => {
    setEditMode("edit");
    setSelectedUser(u);
    setIsEditOpen(true);
  };
  const openCreate = () => {
    setEditMode("create");
    setSelectedUser(null);
    setIsEditOpen(true);
  };
  const handleSaved = (_saved: AdminUser) => {
    setReloadTick((t) => t + 1);
  };

  const hasActiveFilters = !!search || !!statusFilter || !!roleFilter;
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setRoleFilter("");
    setPage(1);
  };

  const columns: TableColumn<AdminUser>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        sortKey: "last_name",
        render: (u) => (
          <MiddleTruncate 
            text={u.full_name}
            className="font-semibold text-slate-900 dark:text-slate-100"
          />
        ),
      },
      {
        key: "email",
        header: "Email",
        sortKey: "email",
        render: (u) => (
          <MiddleTruncate 
            text={u.email}
            className="text-sm text-slate-600 dark:text-slate-400"
          />
        ),
      },
      {
        key: "office",
        header: "Office",
        render: (u) => (
          <MiddleTruncate 
            text={u.office?.name ?? "—"}
            className="text-sm text-slate-600 dark:text-slate-400"
          />
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (u) => {
          const raw = u.role?.name ?? "none";
          // Replace underscores and Title Case
          const label = raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          return (
             <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
               {label}
             </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        render: (u) => (
          <span className={`text-xs font-medium ${u.disabled_at ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {u.disabled_at ? "Disabled" : "Active"}
          </span>
        ),
      },
      {
        key: "created",
        header: "Joined",
        sortKey: "created_at",
        render: (u) => (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(u.created_at)}
          </div>
        ),
      },
    ],
    [],
  );

  if (!isAdmin) {
    return (
      <PageFrame title="User Manager">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Admin access required.
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="User Manager"
      contentClassName="flex flex-col min-h-0 h-full"
      right={
        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={() => setReloadTick((t) => t + 1)}
            loading={loading || initialLoading}
            title="Refresh users"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreate}
          >
            New user
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
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name / email…"
              className={`${inputCls} pl-9 pr-8 text-sm`}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                title="Clear"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
              className={`${selectCls} text-xs h-8 w-32`}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={`${selectCls} text-xs h-8 w-40`}
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label || r.name}
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
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className={selectCls}
                >
                  <option value="">All roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label || r.name}
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

      <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 overflow-hidden">
        <Table<AdminUser>
          bare
          className="h-full"
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          onRowClick={openEdit}
          loading={loading}
          initialLoading={initialLoading}
          error={error}
          emptyMessage="No users found."
          hasMore={hasMore}
          onLoadMore={() => setPage((p) => p + 1)}
          gridTemplateColumns="minmax(140px, 0.8fr) minmax(180px, 0.8fr) minmax(220px, 1.6fr) 8rem 7rem 8rem"
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key as typeof sortBy);
            setSortDir(dir);
          }}
        />
      </div>

      <UserEditModal
        open={isEditOpen}
        mode={editMode}
        user={selectedUser}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedUser(null);
        }}
        onSaved={handleSaved}
      />
    </PageFrame>
  );
};

export default UserManagerPage;
