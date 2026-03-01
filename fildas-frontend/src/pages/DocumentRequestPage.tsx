import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame.tsx";
import Button from "../components/ui/Button.tsx";
import { getAuthUser } from "../lib/auth.ts";
import {
  getDocumentRequest,
  getDocumentRequestExamplePreviewLink,
  submitDocumentRequestEvidence,
} from "../services/documentRequests";

function roleLower(me: any) {
  const raw = typeof me?.role === "string" ? me?.role : me?.role?.name;
  return String(raw ?? "").toLowerCase();
}

export default function DocumentRequestPage() {
  const navigate = useNavigate();
  const params = useParams();
  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  const requestId = Number(params.id);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return <Navigate to="/dashboard" replace />;
  }

  const role = roleLower(me);
  const isQa = role === "qa" || role === "sysadmin";

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [req, setReq] = React.useState<any | null>(null);

  // Path A UI bridge: backend show() will return a single recipient object
  // so the office can submit and QA can review for this request.
  const [recipient, setRecipient] = React.useState<any | null>(null);

  const [rightTab, setRightTab] = React.useState<"example" | "submission">(
    "example",
  );

  // Example preview
  const [examplePreviewUrl, setExamplePreviewUrl] = React.useState<string>("");
  const [examplePreviewLoading, setExamplePreviewLoading] =
    React.useState(false);
  const [examplePreviewError, setExamplePreviewError] = React.useState<
    string | null
  >(null);

  // Submit evidence (office)
  const [note, setNote] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMsg, setSubmitMsg] = React.useState<string | null>(null);
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSubmitMsg(null);
    setSubmitErr(null);

    try {
      const data = await getDocumentRequest(requestId);
      setReq(data.request);
      setRecipient((data as any).recipient ?? null);
    } catch (e: any) {
      setReq(null);
      setRecipient(null);
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to load request.",
      );
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  React.useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const myOfficeId = Number(
    (me as any)?.office_id ?? (me as any)?.office?.id ?? 0,
  );

  const canSubmit = !isQa && req?.status === "open" && !!recipient?.id;

  const loadExamplePreview = React.useCallback(async () => {
    if (!req?.example_preview_path) {
      setExamplePreviewUrl("");
      return;
    }

    setExamplePreviewLoading(true);
    setExamplePreviewError(null);

    try {
      const res = await getDocumentRequestExamplePreviewLink(requestId);
      setExamplePreviewUrl(res.url);
    } catch (e: any) {
      setExamplePreviewUrl("");
      setExamplePreviewError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to load example preview.",
      );
    } finally {
      setExamplePreviewLoading(false);
    }
  }, [req?.example_preview_path, requestId]);

  React.useEffect(() => {
    loadExamplePreview().catch(() => {});
  }, [loadExamplePreview]);

  const handleSelectFiles = (picked: FileList | null) => {
    setSubmitMsg(null);
    setSubmitErr(null);

    const arr = picked ? Array.from(picked) : [];
    if (arr.length === 0) {
      setFiles([]);
      return;
    }

    if (arr.length > 1) {
      setFiles([]);
      setSubmitErr("Please upload only 1 file for now.");
      return;
    }

    const tooBig = arr.find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) {
      setFiles([]);
      setSubmitErr(`File too large: ${tooBig.name} (max 10MB).`);
      return;
    }

    setFiles(arr);
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitMsg(null);
    setSubmitErr(null);

    try {
      if (!recipient?.id) {
        setSubmitErr("Recipient record is missing for this request.");
        return;
      }

      if (!canSubmit) {
        setSubmitErr("This request is not open for submission.");
        return;
      }
      if (files.length < 1) {
        setSubmitErr("Please attach at least 1 file.");
        return;
      }
      if (files.length > 5) {
        setSubmitErr("Max 5 files per submission.");
        return;
      }

      await submitDocumentRequestEvidence({
        request_id: requestId,
        recipient_id: Number(recipient.id),
        note: note.trim() ? note.trim() : null,
        files,
      });

      setSubmitMsg("Submission uploaded successfully.");
      setNote("");
      setFiles([]);

      await load();
    } catch (e: any) {
      setSubmitErr(
        e?.response?.data?.message ?? e?.message ?? "Submit failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageFrame
      title={`Document Request #${requestId}`}
      right={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/document-requests")}
        >
          ← Back
        </Button>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Loading request details...
        </div>
      ) : error ? (
        <div className="p-4 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          {error}
        </div>
      ) : !req ? (
        <div className="p-4 text-sm text-slate-500">Request not found.</div>
      ) : (
        <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT PANE */}
          <section className="lg:col-span-7 min-w-0 min-h-0 flex flex-col overflow-hidden">
            {/* Left header (non-scroll) */}
            <div className="shrink-0 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">
                      Document request
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 truncate">
                      {req.title}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 font-semibold border " +
                          (req.status === "open"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : req.status === "cancelled"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-100 text-slate-700 border-slate-200")
                        }
                      >
                        {String(req.status).toUpperCase()}
                      </span>

                      <span className="text-slate-300">•</span>

                      <span>
                        Due:{" "}
                        <span className="font-medium text-slate-800">
                          {req.due_at
                            ? new Date(req.due_at).toLocaleString()
                            : "-"}
                        </span>
                      </span>

                      <span className="text-slate-300">•</span>

                      <span>
                        Sender:{" "}
                        <span className="font-medium text-slate-800">
                          {req.created_by_user_id
                            ? `User #${req.created_by_user_id}`
                            : "-"}
                        </span>
                      </span>

                      <span className="text-slate-300">•</span>

                      <span>
                        Recipient:{" "}
                        <span className="font-medium text-slate-800">
                          {req.office_name
                            ? `${req.office_name}${req.office_code ? ` (${req.office_code})` : ""}`
                            : req.office_id
                              ? `Office #${req.office_id}`
                              : "-"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[11px] text-slate-500">
                      Request #{requestId}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Example:{" "}
                      <span className="font-medium text-slate-700">
                        {req.example_original_filename ??
                          (req.example_file_path ? "Attached" : "None")}
                      </span>
                    </div>
                  </div>
                </div>

                {req.description ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Instructions / Description
                    </div>
                    <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                      {req.description}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Left scroll body */}
            <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Comments/Activity placeholder */}
              <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs"
                    >
                      Comments
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Activity
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    We’ll hook this up to document request comments + activity
                    logs next.
                  </div>
                </div>

                <div className="p-5 text-sm text-slate-700">Coming soon.</div>
              </div>
            </div>
          </section>

          {/* RIGHT PANE */}
          <aside className="lg:col-span-5 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 overflow-hidden flex min-h-0 flex-1 flex-col">
              {/* Tabs header */}
              <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRightTab("example")}
                      className={
                        "rounded-md px-3 py-1.5 text-xs font-semibold transition " +
                        (rightTab === "example"
                          ? "bg-white text-slate-900 border border-slate-200 shadow-xs"
                          : "text-slate-600 hover:text-slate-900")
                      }
                    >
                      Example
                    </button>

                    <button
                      type="button"
                      onClick={() => setRightTab("submission")}
                      className={
                        "rounded-md px-3 py-1.5 text-xs font-semibold transition " +
                        (rightTab === "submission"
                          ? "bg-white text-slate-900 border border-slate-200 shadow-xs"
                          : "text-slate-600 hover:text-slate-900")
                      }
                    >
                      Submission
                    </button>
                  </div>

                  {rightTab === "example" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadExamplePreview()}
                      disabled={examplePreviewLoading}
                    >
                      Refresh
                    </Button>
                  ) : null}
                </div>

                <div className="mt-2 text-[11px] text-slate-500">
                  {rightTab === "example"
                    ? "Reference file attached by QA (if provided)."
                    : isQa
                      ? "QA view: submission preview + accept/reject will appear here once backend is updated."
                      : "Upload your evidence file here (1 file for now)."}
                </div>
              </div>

              {/* Scroll body */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="p-5 space-y-4">
                  {rightTab === "example" ? (
                    <>
                      {!req.example_preview_path ? (
                        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-600 text-center">
                          No example preview attached.
                        </div>
                      ) : examplePreviewLoading ? (
                        <div className="rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                          Loading preview…
                        </div>
                      ) : examplePreviewError ? (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
                          {examplePreviewError}
                        </div>
                      ) : examplePreviewUrl ? (
                        <div className="h-[70vh] min-h-105 w-full overflow-hidden rounded-md border border-slate-200 bg-white">
                          <iframe
                            title="Document request example preview"
                            src={examplePreviewUrl}
                            className="h-full w-full"
                          />
                        </div>
                      ) : (
                        <div className="rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                          Preview link not loaded.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isQa ? (
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
                          No submission data loaded yet (backend update
                          pending).
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {!canSubmit ? (
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              Submissions are allowed only when the request is
                              open.
                            </div>
                          ) : null}

                          {/* Dropzone */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSelectFiles(e.dataTransfer.files);
                            }}
                            className={
                              "rounded-xl border border-dashed px-4 py-10 text-center transition " +
                              (canSubmit
                                ? "border-slate-300 bg-white hover:bg-slate-50/60"
                                : "border-slate-200 bg-slate-50 opacity-70")
                            }
                          >
                            <div className="text-sm font-semibold text-slate-900">
                              Click to upload or drag & drop
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              PDF, Word, Excel, PowerPoint (max 10MB)
                            </div>

                            <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700">
                              Choose file
                              <input
                                type="file"
                                className="hidden"
                                disabled={!canSubmit || submitting}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                onChange={(e) =>
                                  handleSelectFiles(e.target.files)
                                }
                              />
                            </label>
                          </div>

                          {/* Selected */}
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <div className="text-xs font-semibold text-slate-700">
                              Selected file
                            </div>
                            <div className="mt-1 text-sm text-slate-900 truncate">
                              {files.length ? files[0].name : "None"}
                            </div>
                            {files.length ? (
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setFiles([])}
                                  disabled={!canSubmit || submitting}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : null}
                          </div>

                          {/* Note */}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">
                              Note (optional)
                            </label>
                            <textarea
                              rows={3}
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                              placeholder="Optional message to QA…"
                              disabled={!canSubmit || submitting}
                            />
                          </div>

                          {submitMsg ? (
                            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                              {submitMsg}
                            </div>
                          ) : null}

                          {submitErr ? (
                            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                              {submitErr}
                            </div>
                          ) : null}

                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              disabled={
                                !canSubmit || submitting || files.length !== 1
                              }
                              onClick={() => submit()}
                              className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:opacity-60"
                            >
                              {submitting ? "Submitting…" : "Submit"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </PageFrame>
  );
}
