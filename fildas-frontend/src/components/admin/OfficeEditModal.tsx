import React, { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import InlineSpinner from "../ui/loader/InlineSpinner";
import AdminOfficeDropdown from "./AdminOfficeDropdown";

import {
  createAdminOffice,
  disableAdminOffice,
  restoreAdminOffice,
  updateAdminOffice,
  type AdminOffice,
} from "../../services/admin";

type Props = {
  open: boolean;
  mode: "edit" | "create";
  office: AdminOffice | null;
  onClose: () => void;
  onSaved?: (saved?: AdminOffice) => void;
};

export default function OfficeEditModal({
  open,
  mode,
  office,
  onClose,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<null | "disable" | "restore">(null);
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === "edit";
  const isDisabled = isEdit && !!office?.deleted_at;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("office");
  const [description, setDescription] = useState("");
  const [clusterKind, setClusterKind] = useState<"" | "vp" | "president">("");
  const [parentOfficeId, setParentOfficeId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);

    if (!isEdit) {
      setName("");
      setCode("");
      setType("office");
      setDescription("");
      setClusterKind("");
      setParentOfficeId(null);
      return;
    }

    setName(office?.name ?? "");
    setCode(office?.code ?? "");
    setType(office?.type ?? "office");
    setDescription(office?.description ?? "");
    setClusterKind((office?.cluster_kind ?? "") as any);
    setParentOfficeId(office?.parent_office_id ?? null);
  }, [open, isEdit, office]);

  const canSave = useMemo(() => {
    if (!open) return false;
    if (isEdit && !office) return false;
    if (isDisabled) return false;

    if (!name.trim()) return false;
    if (!code.trim()) return false;

    return true;
  }, [open, isEdit, office, isDisabled, name, code]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!isEdit) {
        const res = await createAdminOffice({
          name: name.trim(),
          code: code.trim(),
          type: type.trim() || "office",
          description: description.trim() || null,
          cluster_kind: clusterKind ? clusterKind : null,
          parent_office_id: parentOfficeId,
        });

        onSaved?.(res.office);
        onClose();
        return;
      }

      if (!office) return;

      const res = await updateAdminOffice(office.id, {
        name: name.trim(),
        code: code.trim(),
        type: type.trim() || "office",
        description: description.trim() || null,
        cluster_kind: clusterKind ? clusterKind : null,
        parent_office_id: parentOfficeId,
      });

      onSaved?.(res.office);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!office) return;
    if (!confirm(`Disable office ${office.name} (${office.code})?`)) return;

    try {
      setActing("disable");
      setError(null);
      await disableAdminOffice(office.id);
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to disable office",
      );
    } finally {
      setActing(null);
    }
  };

  const handleRestore = async () => {
    if (!office) return;
    if (!confirm(`Restore office ${office.name} (${office.code})?`)) return;

    try {
      setActing("restore");
      setError(null);
      const res = await restoreAdminOffice(office.id);
      onSaved?.(res.office);
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to restore office",
      );
    } finally {
      setActing(null);
    }
  };

  return (
    <Modal
      open={open}
      title={
        mode === "create"
          ? "New office"
          : office
            ? `Edit office: ${office.name}`
            : "Edit office"
      }
      onClose={() => {
        if (saving || acting) return;
        onClose();
      }}
      widthClassName="max-w-2xl"
    >
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-slate-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving || !!acting || isDisabled}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Code <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-slate-50"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={saving || !!acting || isDisabled}
            placeholder="e.g. IT, HR, QA"
          />
          <p className="mt-1 text-xs text-slate-500">
            Backend will normalize to uppercase and enforce uniqueness.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Type
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-slate-50"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={saving || !!acting || isDisabled}
            placeholder="office"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Description
          </label>
          <textarea
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-slate-50"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving || !!acting || isDisabled}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Cluster kind
          </label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-slate-50"
            value={clusterKind}
            onChange={(e) => setClusterKind(e.target.value as any)}
            disabled={saving || !!acting || isDisabled}
          >
            <option value="">None</option>
            <option value="vp">VP office</option>
            <option value="president">President office (only 1 allowed)</option>
          </select>
        </div>

        <div>
          <AdminOfficeDropdown
            value={parentOfficeId}
            onChange={setParentOfficeId}
            label="Parent office"
            required={false}
            disabled={saving || !!acting || isDisabled}
            excludeOfficeIds={office ? [office.id] : []}
            autoLoad={true}
          />
          <p className="mt-1 text-xs text-slate-500">
            Used for default routing/reporting lines.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isEdit && office && (
            <>
              {isDisabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRestore}
                  disabled={saving || acting !== null}
                >
                  {acting === "restore" ? "Restoring..." : "Restore"}
                </Button>
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

          {isDisabled && (
            <div className="text-xs text-slate-500">
              This office is disabled and cannot be modified until restored.
            </div>
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
}
