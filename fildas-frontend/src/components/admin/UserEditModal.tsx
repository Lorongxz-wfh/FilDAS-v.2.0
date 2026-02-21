import React, { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import InlineSpinner from "../ui/loader/InlineSpinner";
import AdminOfficeDropdown from "./AdminOfficeDropdown";
import {
  createAdminUser,
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  getAdminRoles,
  type AdminRole,
  type AdminUser,
  updateAdminUser,
} from "../../services/admin";

type Props = {
  open: boolean;
  mode: "edit" | "create";
  user: AdminUser | null;
  onClose: () => void;
  onSaved?: (saved: AdminUser) => void;
};

const UserEditModal: React.FC<Props> = ({
  open,
  mode,
  user,
  onClose,
  onSaved,
}) => {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<null | "disable" | "enable" | "delete">(
    null,
  );

  // Form state
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);
  const [officeId, setOfficeId] = useState<number | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;

    setError(null);

    if (mode === "create") {
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setSuffix("");
      setEmail("");
      setRoleId(null);
      setOfficeId(null);
      setPassword("");
      return;
    }

    // mode === "edit"
    setFirstName(user?.first_name ?? "");
    setMiddleName(user?.middle_name ?? "");
    setLastName(user?.last_name ?? "");
    setSuffix(user?.suffix ?? "");
    setEmail(user?.email ?? "");
    setRoleId(user?.role_id ?? null);
    setOfficeId(user?.office_id ?? null);
    setPassword("");
  }, [open, user, mode]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        const data = await getAdminRoles();
        if (!alive) return;
        setRoles(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load roles");
      } finally {
        if (!alive) return;
        setLoadingRoles(false);
      }
    };

    loadRoles();
    return () => {
      alive = false;
    };
  }, [open]);

  const canSave = useMemo(() => {
    if (mode === "edit" && !user) return false;
    if (mode === "edit" && user?.deleted_at) return false;
    if (!firstName.trim()) return false;
    if (!lastName.trim()) return false;
    if (!email.trim()) return false;
    if (mode === "create" && password.trim().length < 6) return false;
    return true;
  }, [mode, user, firstName, lastName, email, password]);

  const handleDisable = async () => {
    if (!user) return;
    if (!confirm(`Disable ${user.full_name}?`)) return;

    try {
      setActing("disable");
      setError(null);
      const res = await disableAdminUser(user.id);
      onSaved?.(res.user);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to disable user");
    } finally {
      setActing(null);
    }
  };

  const handleEnable = async () => {
    if (!user) return;
    if (!confirm(`Enable ${user.full_name}?`)) return;

    try {
      setActing("enable");
      setError(null);
      const res = await enableAdminUser(user.id);
      onSaved?.(res.user);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to enable user");
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const ok = confirm(
      `Soft delete ${user.full_name}?\n\nThis hides the account and blocks access. You can show deleted users via filter later.`,
    );
    if (!ok) return;

    try {
      setActing("delete");
      setError(null);
      await deleteAdminUser(user.id);
      onClose();
      // Tell parent to refetch (we don't have the deleted user object anymore)
      onSaved?.({ ...user, deleted_at: new Date().toISOString() });
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete user");
    } finally {
      setActing(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const effectiveOfficeId = roleDisablesOffice ? null : officeId;

      if (mode === "create") {
        const res = await createAdminUser({
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim(),
          suffix: suffix.trim() || null,
          email: email.trim(),
          password: password,
          role_id: roleId,
          office_id: effectiveOfficeId,
        });

        onSaved?.(res.user);
        onClose();
        return;
      }

      if (!user) return;

      const res = await updateAdminUser(user.id, {
        first_name: firstName.trim() || null,
        middle_name: middleName.trim() || null,
        last_name: lastName.trim() || null,
        suffix: suffix.trim() || null,
        email: email.trim() || null,
        role_id: roleId,
        office_id: effectiveOfficeId,
      });

      onSaved?.(res.user);
      onClose();
    } catch (e: any) {
      setError(
        e?.message ??
          (mode === "create"
            ? "Failed to create user"
            : "Failed to update user"),
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedRoleName = useMemo(() => {
    if (!roleId) return null;
    return roles.find((r) => r.id === roleId)?.name?.toLowerCase() ?? null;
  }, [roleId, roles]);

  const roleDisablesOffice =
    selectedRoleName === "admin" || selectedRoleName === "auditor";
  useEffect(() => {
    if (!open) return;
    if (!roleDisablesOffice) return;
    setOfficeId(null);
  }, [open, roleDisablesOffice]);

  const roleOptionsDisabled = loadingRoles || roles.length === 0;

  const isDeleted = mode === "edit" && !!user?.deleted_at;

  return (
    <Modal
      open={open}
      title={
        mode === "create"
          ? "New user"
          : user
            ? `Edit user: ${user.full_name}`
            : "Edit user"
      }
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      widthClassName="max-w-2xl"
    >
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            First name <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Middle name
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Last name <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Suffix
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
          />
        </div>

        {mode === "create" && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
              placeholder="Min 6 characters"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Role
          </label>
          <div className="relative">
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-slate-50"
              value={roleId ?? ""}
              onChange={(e) =>
                setRoleId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={saving || roleOptionsDisabled}
            >
              <option value="">No role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label || r.name}
                </option>
              ))}
            </select>

            {loadingRoles && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                <InlineSpinner className="h-4 w-4 border-2" />
              </div>
            )}
          </div>
        </div>

        <div>
          <AdminOfficeDropdown
            value={officeId}
            onChange={setOfficeId}
            required={false}
            disabled={roleDisablesOffice}
            autoLoad={!roleDisablesOffice}
            label={
              roleDisablesOffice
                ? "Office / Department (not applicable)"
                : "Office / Department"
            }
          />

          {roleDisablesOffice && (
            <p className="mt-1 text-xs text-slate-500">
              Office is disabled for Admin/Auditor accounts.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isDeleted && (
            <div className="text-xs text-slate-500">
              This user is deleted and cannot be modified.
            </div>
          )}

          {mode === "edit" && user && !isDeleted && (
            <>
              {user.disabled_at ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnable}
                    disabled={saving || acting !== null}
                  >
                    {acting === "enable" ? "Enabling..." : "Enable"}
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    disabled={saving || acting !== null}
                  >
                    {acting === "delete" ? "Deleting..." : "Delete"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisable}
                  disabled={saving || acting !== null}
                >
                  {acting === "disable" ? "Disabling..." : "Disable"}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving || acting !== null}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!canSave || saving || acting !== null}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <InlineSpinner className="h-4 w-4 border-2" />
                Saving
              </span>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserEditModal;
