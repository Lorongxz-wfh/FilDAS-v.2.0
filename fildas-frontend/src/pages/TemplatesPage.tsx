import React, { useCallback, useEffect, useState } from "react";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/toast/ToastContext";

import {
  listTemplates,
  deleteTemplate,
  type DocumentTemplate,
} from "../services/templates";

import TemplateList from "../components/templates/TemplateList";
import TemplateUploadForm from "../components/templates/TemplateUploadForm";
import TemplateDetailPanel from "../components/templates/TemplateDetailPanel";

const TemplatesPage: React.FC = () => {
  const { push } = useToast();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);

  // ── Fetch ──────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTemplates();
      setTemplates(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Delete ─────────────────────────────────────────────────

  const handleDeleteClick = async (id: number) => {
    if (!window.confirm("Delete this template? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setSelectedTemplate((prev) => (prev?.id === id ? null : prev));
      push({ type: "success", title: "Deleted", message: "Template removed." });
    } catch (e: any) {
      push({
        type: "error",
        title: "Delete failed",
        message: e?.message ?? "Unknown error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // ── After upload ───────────────────────────────────────────

  const handleUploaded = (template: DocumentTemplate) => {
    setTemplates((prev) => [template, ...prev]);
    setModalOpen(false);
  };

  // ── UI ─────────────────────────────────────────────────────

  return (
    <>
      <PageFrame
        title="Document Templates"
        right={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            + Upload template
          </Button>
        }
      >
        {/* Full-width list card */}
        <div className="rounded-2xl border border-slate-200 dark:border-surface-400 bg-white/80 dark:bg-surface-500/80 shadow-sm">
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-400 bg-slate-50/80 dark:bg-surface-600/80 px-5 py-4">
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Available templates
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Global templates are visible to everyone. Office templates are
                visible to your office only.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchTemplates}
              disabled={loading}
              className="rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-400 disabled:opacity-50 transition"
            >
              Refresh
            </button>
          </div>

          <div className="p-5">
            {error ? (
              <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
                {error}
                <button
                  type="button"
                  className="ml-3 underline text-rose-600 dark:text-rose-400"
                  onClick={fetchTemplates}
                >
                  Retry
                </button>
              </div>
            ) : (
              <TemplateList
                templates={templates}
                loading={loading}
                deletingId={deletingId}
                onDeleteClick={handleDeleteClick}
                onSelect={setSelectedTemplate}
              />
            )}
          </div>
        </div>
      </PageFrame>

      <TemplateDetailPanel
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        isDeleting={deletingId === selectedTemplate?.id}
        onDeleteClick={handleDeleteClick}
      />

      {/* Upload modal */}
      <Modal
        open={modalOpen}
        title="Upload template"
        onClose={() => setModalOpen(false)}
        widthClassName="max-w-lg"
      >
        {/* Scope note */}
        <div className="mb-4 rounded-xl border border-slate-200 dark:border-surface-400 bg-slate-50 dark:bg-surface-600 px-4 py-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Who can see your upload?
          </p>
          <p>
            <span className="font-medium text-violet-700 dark:text-violet-400">
              Admin / QA
            </span>{" "}
            — visible to <strong>all offices</strong>.
          </p>
          <p>
            <span className="font-medium text-sky-700 dark:text-sky-400">
              Other roles
            </span>{" "}
            — visible to your office only.
          </p>
        </div>

        <TemplateUploadForm onUploaded={handleUploaded} />
      </Modal>
    </>
  );
};

export default TemplatesPage;
