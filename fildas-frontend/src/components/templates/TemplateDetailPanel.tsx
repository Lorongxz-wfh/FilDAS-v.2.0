import React, { useEffect, useRef, useState } from "react";
import type { DocumentTemplate } from "../../services/templates";
import {
  templateFileTypeLabel,
  downloadTemplate,
} from "../../services/templates";
import {
  createTempPreview,
  deleteTempPreview,
  type TempPreview,
} from "../../services/previews";
import { useToast } from "../ui/toast/ToastContext";
import { Download, Trash2, X } from "lucide-react";

type Props = {
  template: DocumentTemplate | null;
  onClose: () => void;
  isDeleting: boolean;
  onDeleteClick: (id: number) => void;
};

const TemplateDetailPanel: React.FC<Props> = ({
  template,
  onClose,
  isDeleting,
  onDeleteClick,
}) => {
  const { push } = useToast();
  const [downloading, setDownloading] = useState(false);

  const [preview, setPreview] = useState<TempPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const seqRef = useRef(0);
  const previewRef = useRef<TempPreview | null>(null);

  const cleanupPreview = (p: TempPreview | null) => {
    if (!p) return;
    deleteTempPreview(p.year, p.id).catch(() => {});
  };

  // Load preview when template changes
  useEffect(() => {
    if (!template) {
      cleanupPreview(previewRef.current);
      previewRef.current = null;
      setPreview(null);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    seqRef.current += 1;
    const seq = seqRef.current;

    cleanupPreview(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setPreviewLoading(true);
    setPreviewError(null);

    (async () => {
      try {
        // Fetch the file as blob, then create a File object to upload to preview service
        const api = (await import("../../services/api")).default;
        const res = await api.get(`/templates/${template.id}/download`, {
          responseType: "blob",
        });
        const blob = res.data as Blob;
        const file = new File([blob], template.original_filename, {
          type: template.mime_type,
        });

        const result = await createTempPreview(file);
        if (seq !== seqRef.current) return;
        previewRef.current = result;
        setPreview(result);
      } catch (e: any) {
        if (seq !== seqRef.current) return;
        setPreviewError(e?.message ?? "Failed to generate preview.");
      } finally {
        if (seq !== seqRef.current) return;
        setPreviewLoading(false);
      }
    })();

    return () => {
      seqRef.current += 1;
    };
  }, [template?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupPreview(previewRef.current);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDownload = async () => {
    if (!template) return;
    setDownloading(true);
    try {
      await downloadTemplate(template.id, template.original_filename);
    } catch (e: any) {
      push({
        type: "error",
        title: "Download failed",
        message: e?.message ?? "Unknown error",
      });
    } finally {
      setDownloading(false);
    }
  };

  const open = !!template;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/50"
        />
      )}

      {/* Panel */}
      <div
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col",
          "border-l border-slate-200 dark:border-surface-400",
          "bg-white dark:bg-surface-500 shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {template && (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 dark:border-surface-400 bg-slate-50/80 dark:bg-surface-600/80 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center rounded bg-slate-100 dark:bg-surface-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {templateFileTypeLabel(template.mime_type)}
                  </span>

                  {template.is_global ? (
                    <span className="inline-flex items-center rounded bg-sky-50 dark:bg-sky-950/30 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                      Global
                    </span>
                  ) : template.office ? (
                    <span className="inline-flex items-center rounded bg-slate-100 dark:bg-surface-400 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {template.office.code}
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {template.name}
                </h2>

                {template.description && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {template.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  <span>{template.original_filename}</span>
                  <span>{template.file_size_label}</span>
                  {template.uploaded_by && (
                    <span>by {template.uploaded_by.name}</span>
                  )}
                  <span>
                    {new Date(template.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-surface-400 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 dark:border-surface-400 px-5 py-3">
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-surface-400 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? "Downloading…" : "Download"}
              </button>

              {template.can_delete && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => onDeleteClick(template.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-800 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-hidden p-4">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 dark:border-surface-400 bg-slate-50 dark:bg-surface-600">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Generating preview…
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Office files may take a few seconds.
                    </p>
                  </div>
                </div>
              ) : previewError ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30">
                  <div className="text-center px-6">
                    <p className="text-sm text-rose-700 dark:text-rose-400">
                      Preview unavailable
                    </p>
                    <p className="mt-1 text-xs text-rose-500 dark:text-rose-500">
                      {previewError}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      You can still download the file.
                    </p>
                  </div>
                </div>
              ) : preview?.url ? (
                <iframe
                  title="Template preview"
                  src={preview.url}
                  className="h-full w-full rounded-xl border border-slate-200 dark:border-surface-400"
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default TemplateDetailPanel;
