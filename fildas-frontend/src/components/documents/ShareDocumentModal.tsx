import React, { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import {
  listOffices,
  getDocumentShares,
  setDocumentShares,
  type Office,
} from "../../services/documents";

type Props = {
  open: boolean;
  documentId: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

export default function ShareDocumentModal({
  open,
  documentId,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [offices, setOffices] = useState<Office[]>([]);
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filteredOffices = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return offices;
    return offices.filter(
      (o) =>
        o.name.toLowerCase().includes(s) || o.code.toLowerCase().includes(s),
    );
  }, [offices, q]);

  useEffect(() => {
    if (!open) return;
    if (!documentId) return;

    let alive = true;

    const load = async () => {
      setError(null);
      setLoadingOffices(true);
      try {
        const [all, shares] = await Promise.all([
          listOffices(),
          getDocumentShares(documentId),
        ]);
        if (!alive) return;

        setOffices(all.sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedIds(shares.office_ids ?? []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load share settings");
      } finally {
        if (!alive) return;
        setLoadingOffices(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [open, documentId]);

  const toggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const save = async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      await setDocumentShares(documentId, selectedIds);
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Share document to offices"
      onClose={() => {
        if (loading) return;
        onClose();
      }}
      widthClassName="max-w-2xl"
    >
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="flex items-end justify-between gap-3 mt-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Search offices
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search office name or code..."
            disabled={loadingOffices || loading}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingOffices || loading}
            onClick={() => setSelectedIds([])}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="max-h-72 overflow-y-auto">
          {loadingOffices ? (
            <div className="p-4 text-sm text-slate-600">Loading offices…</div>
          ) : filteredOffices.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">No offices found.</div>
          ) : (
            filteredOffices.map((o) => {
              const checked = selectedIds.includes(o.id);
              return (
                <label
                  key={o.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {o.name}
                    </div>
                    <div className="text-xs text-slate-500">({o.code})</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.id)}
                    disabled={loading}
                    className="h-4 w-4"
                  />
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={loading}
          onClick={save}
        >
          Save shares
        </Button>
      </div>
    </Modal>
  );
}
