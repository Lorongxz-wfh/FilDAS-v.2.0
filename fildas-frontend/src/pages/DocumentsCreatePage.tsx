import React, { useState } from "react";
import { createDocumentWithProgress } from "../services/documents";
import OfficeDropdown from "../components/OfficeDropdown";

const DocumentsCreatePage: React.FC = () => {
  const [title, setTitle] = useState("");
  const [officeCode, setOfficeCode] = useState<number | null>(null);
  const [doctype, setDoctype] = useState<"internal" | "external" | "forms">(
    "internal",
  );
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    setFieldErrors(null);

    try {
      setUploadPct(0);

      const result = await createDocumentWithProgress(
        {
          title,
          owner_office_id: officeCode!,
          doctype,
          file,
        },
        (pct) => setUploadPct(pct),
      );

      setMessage("Document created successfully.");
      setTitle("");
      setOfficeCode(null);
      setDoctype("internal"); // or 'external' if you prefer default
      setNotes("");
      setFile(null);
    } catch (err: any) {
      const message = err?.message ?? "Failed to create document";
      setError(message);

      if (err?.details && typeof err.details === "object") {
        setFieldErrors(err.details);
      }
    } finally {
      setLoading(false);
      setUploadPct(0);
    }
  };

  return (
    <section className="flex-1">
      <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            New QA Document
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Required fields are marked with an asterisk (*).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. QA Manual – Document Control Procedure"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <OfficeDropdown
              value={officeCode}
              onChange={setOfficeCode}
              error={fieldErrors?.owner_office_id?.[0]}
            />

            <div>
              <label className="block mb-4.5 text-xs font-medium text-slate-700">
                Document Type <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-4 items-center mt-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="internal"
                    checked={doctype === "internal"}
                    onChange={() => setDoctype("internal")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Internal</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="external"
                    checked={doctype === "external"}
                    onChange={() => setDoctype("external")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">External</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="forms"
                    checked={doctype === "forms"}
                    onChange={() => setDoctype("forms")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Forms</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Notes / current step
            </label>
            <textarea
              rows={3}
              disabled
              className="block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-xs outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes will be enabled after workflow/messages migration."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Attach file <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                required
                disabled={loading}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-60"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                }}
              />

              {loading && (
                <div className="w-28 shrink-0">
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-2 bg-sky-600 transition-[width]"
                      style={{ width: `${Math.max(2, uploadPct)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 text-right">
                    {uploadPct}%
                  </div>
                </div>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Accepts Word, Excel, PowerPoint, or PDF (up to 10 MB).
            </p>
          </div>

          {message && (
            <div className="mt-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              <p className="font-medium">{error}</p>
              {fieldErrors && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {Object.entries(fieldErrors).map(([field, messages]) => (
                    <li key={field}>
                      <span className="font-semibold">{field}</span>
                      {": "}
                      {messages.join(" ")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3">
            <p className="text-[11px] text-slate-500">
              Saved documents will appear in your QA documents list.
            </p>
            <button
              type="submit"
              disabled={loading || !officeCode}
              className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save document"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default DocumentsCreatePage;
