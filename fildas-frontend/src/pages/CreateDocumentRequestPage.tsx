import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame.tsx";
import Button from "../components/ui/Button.tsx";
import OfficeDropdown from "../components/OfficeDropdown.tsx";
import { getAuthUser } from "../lib/auth.ts";
import {
  createDocumentRequest,
  getDocumentRequestExamplePreviewLink,
} from "../services/documentRequests";

const MAX_RECIPIENTS = 50;

export default function CreateDocumentRequestPage() {
  const navigate = useNavigate();

  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  const rawRole =
    typeof (me as any).role === "string"
      ? (me as any).role
      : (me as any).role?.name;
  const roleName = String(rawRole ?? "").toLowerCase();

  // Backend: QA/SYSADMIN/ADMIN only (matches router)
  const allowed = new Set(["qa", "sysadmin", "admin"]);
  if (!allowed.has(roleName)) return <Navigate to="/dashboard" replace />;

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueAt, setDueAt] = React.useState<string>("");

  // Recipients: start with 1 row
  const [officeIds, setOfficeIds] = React.useState<number[]>([0]);

  const selectedOfficeIds = React.useMemo(
    () => officeIds.filter((x) => x > 0),
    [officeIds],
  );

  const addRecipient = () => {
    setOfficeIds((prev) => {
      if (prev.length >= MAX_RECIPIENTS) return prev;
      return [...prev, 0];
    });
  };

  const removeRecipient = (idx: number) => {
    setOfficeIds((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [0];
    });
  };

  const updateRecipient = (idx: number, officeId: number | null) => {
    setOfficeIds((prev) => {
      const next = [...prev];
      next[idx] = officeId ?? 0;

      // Prevent duplicates (keep first occurrence, clear duplicates)
      const seen = new Set<number>();
      return next.map((id) => {
        if (!id) return 0;
        if (seen.has(id)) return 0;
        seen.add(id);
        return id;
      });
    });
  };

  const [exampleFile, setExampleFile] = React.useState<File | null>(null);

  // Preview after create (uses signed preview link)
  const [signedPreviewUrl, setSignedPreviewUrl] = React.useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const validate = (): string | null => {
    if (!title.trim()) return "Title is required.";
    if (officeIds.some((x) => x === 0))
      return "Please select an office for each recipient row.";
    if (selectedOfficeIds.length < 1)
      return "Please add at least 1 recipient office.";
    if (selectedOfficeIds.length > MAX_RECIPIENTS)
      return `Max ${MAX_RECIPIENTS} recipients.`;
    return null;
  };

  const loadExamplePreview = async (requestId: number) => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await getDocumentRequestExamplePreviewLink(requestId);
      setSignedPreviewUrl(res.url);
    } catch (e: any) {
      setSignedPreviewUrl("");
      setPreviewError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to load preview link.",
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const v = validate();
      if (v) {
        setError(v);
        return;
      }

      const result = await createDocumentRequest({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        due_at: dueAt ? dueAt : null,
        office_ids: selectedOfficeIds,
        example_file: exampleFile,
      });

      setMessage("Document request created.");
      // Load preview link (only if there is an example preview path; we don't know yet)
      if (exampleFile) {
        await loadExamplePreview(result.id);
      }

      // Redirect to detail page
      navigate(`/document-requests/${result.id}`);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to create request.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFrame
      title="Create Document Request"
      right={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/document-requests")}
          disabled={loading}
        >
          ← Back
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-0">
        {/* Left: form */}
        <div className="lg:col-span-7 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100">
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
                  placeholder="e.g. QMS Evidence Request – ISO 9001 Clause 7.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should offices submit? Add clear instructions."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Due date/time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    If empty, request has no deadline.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Example/guide file (optional)
                  </label>
                  <input
                    type="file"
                    disabled={loading}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-60"
                    onChange={(e) =>
                      setExampleFile(e.target.files?.[0] ?? null)
                    }
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Offices can preview this before submitting evidence.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Recipient offices
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      At least 1 office is required.
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRecipient}
                    disabled={loading || officeIds.length >= MAX_RECIPIENTS}
                  >
                    + Add office
                  </Button>
                </div>

                <div className="mt-3 space-y-3">
                  {officeIds.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="mt-2 text-xs font-medium text-slate-500 w-6">
                        {idx + 1}.
                      </div>

                      <div className="flex-1 min-w-0">
                        <OfficeDropdown
                          value={val > 0 ? val : null}
                          onChange={(id) => updateRecipient(idx, id)}
                          excludeOfficeIds={selectedOfficeIds.filter(
                            (id) => id !== val,
                          )}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRecipient(idx)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {message && (
                <div className="mt-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {message}
                </div>
              )}

              {error && (
                <div className="mt-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Create request"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: preview (after create we can load signed preview link) */}
        <aside className="lg:col-span-5 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/80">
              <div className="text-sm font-semibold tracking-tight text-slate-900">
                Example preview
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Preview uses a signed link after the request is created.
              </div>
            </div>

            <div className="p-5">
              {!exampleFile ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600 text-center">
                  Attach an example file (optional). Preview will be available
                  after create.
                </div>
              ) : isPreviewLoading ? (
                <div className="rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                  Loading preview…
                </div>
              ) : previewError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
                  {previewError}
                </div>
              ) : signedPreviewUrl ? (
                <div className="h-[70vh] min-h-105 w-full overflow-hidden rounded-md border border-slate-200 bg-white">
                  <iframe
                    title="Document request example preview"
                    src={signedPreviewUrl}
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                  Create the request to generate the signed preview link.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}
