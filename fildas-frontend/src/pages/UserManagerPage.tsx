import React, { useEffect, useMemo, useState } from "react";
import { getAuthUser } from "../lib/auth";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import PageFrame from "../components/layout/PageFrame";
import { Card, CardBody } from "../components/ui/Card";
import Table, { type TableColumn } from "../components/ui/Table";
import { getAdminUsers, type AdminUser } from "../services/admin";
import UserEditModal from "../components/admin/UserEditModal";

const UserManagerPage: React.FC = () => {
  const me = getAuthUser();
  const isAdmin = me?.role === "admin";

  // States for users table
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"edit" | "create">("edit");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await getAdminUsers({
          page,
          q: search || undefined,
        });

        if (cancelled) return;
        setUsers(res.data);
        setMeta(res.meta);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Failed to load users");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [page, search]);

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

  const handleSaved = (saved: AdminUser) => {
    if (editMode === "create") {
      // Option X: refetch by jumping to page 1 (effect will reload)
      setPage(1);
      return;
    }

    // edit mode: patch current page
    setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
  };

  const columns: TableColumn<AdminUser>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (u) => (
          <div className="font-medium text-slate-900">{u.full_name}</div>
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (u) => <div className="text-slate-700">{u.email}</div>,
      },
      {
        key: "office",
        header: "Office",
        render: (u) => (
          <div className="text-slate-700">{u.office?.name ?? "-"}</div>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (u) => {
          const role = u.role?.name ?? "none";
          const isAdminRole = role.toLowerCase() === "admin";
          return (
            <span
              className={[
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                isAdminRole
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-slate-200 bg-slate-50 text-slate-700",
              ].join(" ")}
            >
              {role}
            </span>
          );
        },
      },
    ],
    [],
  );

  if (!isAdmin) {
    return (
      <PageFrame title="System Admin" contentClassName="space-y-6">
        <Card>
          <CardBody>
            <Alert variant="danger">Admin access required.</Alert>
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
              >
                ← Back
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="System Admin"
      contentClassName="space-y-6"
      right={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreate}
          >
            New user
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPage(1);
              setSearch("");
            }}
            disabled={!search}
          >
            Clear search
          </Button>
        </div>
      }
    >
      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Users</div>
              <div className="text-xs text-slate-600">
                {meta?.total != null ? `${meta.total} total` : " "}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                className="w-full sm:w-80 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Search name/email…"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(1);
                  setSearch("");
                }}
                disabled={!search}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="mt-4">
            {error && <Alert variant="danger">{error}</Alert>}

            <Table<AdminUser>
              columns={columns}
              rows={users}
              loading={loading}
              loadingStyle="skeleton"
              error={null}
              emptyMessage="No users found for the current filter."
              rowKey={(u) => u.id}
              onRowClick={openEdit}
              className="h-130"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Page {meta?.current_page ?? page} of {meta?.last_page ?? 1}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={(meta?.current_page ?? page) <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  loading ||
                  (meta?.last_page
                    ? (meta.current_page ?? page) >= meta.last_page
                    : false)
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-sm font-semibold text-slate-900">Roles</div>
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
          <div className="mt-2 text-sm text-slate-600">Roles coming soon.</div>
        </CardBody>
      </Card>
    </PageFrame>
  );
};

export default UserManagerPage;
