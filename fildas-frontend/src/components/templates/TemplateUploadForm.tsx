import React, { useState } from "react";
import {
  uploadTemplate,
  type DocumentTemplate,
} from "../../services/templates";
import { useToast } from "../ui/toast/ToastContext";
import Button from "../ui/Button";

type Props = {
  onUploaded: (template: DocumentTemplate) => void;
};

const ALLOWED_EXT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
const MAX_MB = 20;

const TemplateUploadForm: React.FC<Props> = ({ onUploaded }) => {
  const { push } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDescription("");
    setFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!file) {
      setError("Please select a file.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB} MB.`);
      return;
    }

    setLoading(true);
    try {
      const template = await uploadTemplate({ name, description, file });
      push({
        type: "success",
        title: "Template uploaded",
        message: template.name,
      });
      onUploaded(template);
      reset();
    } catch (e: any) {
      setError(e?.message ?? "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Template name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Leave Request Form"
          disabled={loading}
          className="block w-full rounded-md border border-slate-300 dark:border-surface-400 bg-white dark:bg-surface-400 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Description
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          disabled={loading}
          className="block w-full rounded-md border border-slate-300 dark:border-surface-400 bg-white dark:bg-surface-400 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-60 resize-none"
        />
      </div>

      {/* File */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          File <span className="text-rose-500">*</span>
        </label>
        <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
          PDF, Word, Excel, or PowerPoint — max {MAX_MB} MB.
        </p>
        <input
          type="file"
          accept={ALLOWED_EXT}
          disabled={loading}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-700 dark:text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 dark:file:bg-sky-950/40 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-700 dark:file:text-sky-400 hover:file:bg-sky-100 dark:hover:file:bg-sky-950/60 disabled:opacity-60"
        />
        {file && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {file.name} — {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={reset}
          disabled={loading}
        >
          Clear
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={loading}>
          {loading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </form>
  );
};

export default TemplateUploadForm;
