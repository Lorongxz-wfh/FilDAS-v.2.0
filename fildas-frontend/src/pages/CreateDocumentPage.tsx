import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import {
  createDocumentWithProgress,
  setDocumentTags,
} from "../services/documents";
import {
  createTempPreview,
  deleteTempPreview,
  type TempPreview,
} from "../services/previews";
import OfficeDropdown from "../components/OfficeDropdown";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";

const CreateDocumentPage: React.FC = () => {
  const navigate = useNavigate();

  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  // Flow #1: QA creates drafts. Flow #2: Office creates drafts.
  const rawRole =
    typeof (me as any).role === "string"
      ? (me as any).role
      : (me as any).role?.name;

  const roleName = String(rawRole ?? "").toLowerCase();
  const allowed = new Set(["qa", "office_staff", "office_head"]);
  if (!allowed.has(roleName)) return <Navigate to="/work-queue" replace />;

  const isQA = roleName === "qa";

  const [step, setStep] = useState<1 | 2>(1);

  const [routingMode, setRoutingMode] = useState<"default" | "custom">(
    "default",
  );
  const [customReviewOfficeIds, setCustomReviewOfficeIds] = useState<number[]>([
    0,
  ]); // 0 = not selected

  const MAX_CUSTOM = 5;

  const customSelectedIds = useMemo(
    () => customReviewOfficeIds.filter((x) => x > 0),
    [customReviewOfficeIds],
  );

  const addCustomRecipient = () => {
    setCustomReviewOfficeIds((prev) => {
      if (prev.length >= MAX_CUSTOM) return prev;
      return [...prev, 0];
    });
  };

  const removeCustomRecipient = (idx: number) => {
    setCustomReviewOfficeIds((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [0];
    });
  };

  const updateCustomRecipient = (idx: number, officeId: number | null) => {
    setCustomReviewOfficeIds((prev) => {
      const next = [...prev];
      next[idx] = officeId ?? 0;

      // Prevent duplicates (keep first occurrence, clear the duplicates)
      const seen = new Set<number>();
      return next.map((id) => {
        if (!id) return 0;
        if (seen.has(id)) return 0;
        seen.add(id);
        return id;
      });
    });
  };

  const validateStep1 = (): string | null => {
    if (routingMode === "default") {
      // QA default needs reviewer office
      if (isQA && !reviewOfficeId) return "Please select a reviewer office.";
      return null;
    }

    // Custom
    if (customSelectedIds.length < 1)
      return "Please add at least 1 recipient office.";
    if (customReviewOfficeIds.some((x) => x === 0))
      return "Please select an office for each recipient row.";
    if (customSelectedIds.length > MAX_CUSTOM)
      return `Custom flow can only have up to ${MAX_CUSTOM} recipient offices.`;
    return null;
  };

  const [title, setTitle] = useState("");
  const [reviewOfficeId, setReviewOfficeId] = useState<number | null>(null);

  const [doctype, setDoctype] = useState<"internal" | "external" | "forms">(
    "internal",
  );

  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Placeholder for later backend support
  const [effectiveDate, setEffectiveDate] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [tempPreview, setTempPreview] = useState<TempPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewSeqRef = React.useRef(0);

  const cleanupTempPreview = (p: TempPreview | null) => {
    if (!p) return;
    deleteTempPreview(p.year, p.id).catch(() => {
      // fire-and-forget
    });
  };

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!file) {
      setPreviewLoading(false);
      setPreviewError(null);
      setTempPreview((prev) => {
        if (prev) cleanupTempPreview(prev);
        return null;
      });
      return;
    }

    // bump sequence (so old requests can't overwrite state)
    previewSeqRef.current += 1;
    const seq = previewSeqRef.current;

    // cleanup any previous preview immediately
    setTempPreview((prev) => {
      if (prev) cleanupTempPreview(prev);
      return null;
    });

    setPreviewLoading(true);
    setPreviewError(null);

    (async () => {
      try {
        const result = await createTempPreview(file);
        if (seq !== previewSeqRef.current) return;
        setTempPreview(result);
      } catch (e: any) {
        if (seq !== previewSeqRef.current) return;
        setPreviewError(e?.message ?? "Failed to generate preview");
      } finally {
        if (seq !== previewSeqRef.current) return;
        setPreviewLoading(false);
      }
    })();
  }, [file]);

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

      // Step 1 config validation (safe guard even if user hacks UI)
      const step1Err = validateStep1();
      if (step1Err) {
        setError(step1Err);
        setStep(1);
        return;
      }

      if (!file) {
        setError("Please attach a file.");
        return;
      }

      const result = await createDocumentWithProgress(
        {
          title,
          workflow_type: isQA ? "qa" : "office",

          routing_mode: routingMode,

          // Default QA uses review_office_id; Office default keeps null
          review_office_id:
            routingMode === "default" && isQA
              ? (reviewOfficeId as number)
              : null,

          // Custom: ordered recipients (review phase for now)
          custom_review_office_ids:
            routingMode === "custom" ? customSelectedIds : undefined,

          doctype,
          description,
          effective_date:
            isQA && effectiveDate.trim() ? effectiveDate.trim() : null,
          file,
        },
        (pct) => setUploadPct(pct),
      );

      // Best-effort: save tags (do not block document creation)
      if (tags.length > 0) {
        try {
          await setDocumentTags(result.id, tags);
        } catch (e) {
          // keep UX smooth: document is created, tags can be edited later
          setMessage(
            "Document created, but tags failed to save (you can try again later).",
          );
        }
      }

      if (!tags.length) {
        setMessage("Document created successfully.");
      } else {
        // if tags saved successfully, keep the success message consistent
        setMessage((prev) => prev ?? "Document created successfully.");
      }

      cleanupTempPreview(tempPreview);
      // After create, redirect to the document flow page so workflow + comments are available.
      navigate(`/documents/${result.id}`);
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
    <PageFrame
      title="Draft Document"
      right={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            cleanupTempPreview(tempPreview);
            navigate(-1);
          }}
          disabled={loading}
        >
          ← Back
        </Button>
      }
    >
      {/* Step indicator */}
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-600">
        <span
          className={
            "inline-flex items-center gap-2 rounded-full px-3 py-1 border " +
            (step === 1
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-slate-200 bg-white text-slate-600")
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          Step 1: Flow setup
        </span>

        <span className="text-slate-400">→</span>

        <span
          className={
            "inline-flex items-center gap-2 rounded-full px-3 py-1 border " +
            (step === 2
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-slate-200 bg-white text-slate-600")
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          Step 2: Document details
        </span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
              <div className="text-sm font-semibold tracking-tight text-slate-900">
                Choose workflow
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Select default routing or build a custom recipient sequence.
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Flow option <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={routingMode}
                    onChange={(e) => {
                      const v = e.target.value as "default" | "custom";
                      setRoutingMode(v);
                      setError(null);

                      // Reset custom list when switching
                      if (
                        v === "custom" &&
                        customReviewOfficeIds.length === 0
                      ) {
                        setCustomReviewOfficeIds([0]);
                      }
                      if (v === "default") {
                        setCustomReviewOfficeIds([0]);
                      }
                    }}
                    className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  >
                    <option value="default">
                      {isQA ? "Default QA Flow" : "Default Office Flow"}
                    </option>
                    <option value="custom">Custom Flow</option>
                  </select>

                  {routingMode === "default" ? (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {isQA
                        ? "Default: QA → Office → VP → QA → Office → VP → President → QA."
                        : "Default: Your Office → Office Head → VP → QA."}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Custom: Choose 1–5 offices in the exact order they will
                      receive the document.
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  This step only sets routing. You will add the file and details
                  in Step 2.
                </div>
              </div>

              {/* Default flow extra requirement */}
              {routingMode === "default" && isQA && (
                <div>
                  <OfficeDropdown
                    value={reviewOfficeId}
                    onChange={setReviewOfficeId}
                    error={fieldErrors?.review_office_id?.[0]}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Required for Default QA Flow.
                  </p>
                </div>
              )}

              {routingMode === "default" && !isQA && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Reviewer office is not needed for Office-created drafts (it
                  will route to Office Head → VP → QA).
                </div>
              )}

              {/* Custom recipients */}
              {routingMode === "custom" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Custom recipients
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Order matters. First is the first receiver.
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomRecipient}
                      disabled={
                        loading || customReviewOfficeIds.length >= MAX_CUSTOM
                      }
                    >
                      + Add recipient
                    </Button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {customReviewOfficeIds.map((val, idx) => (
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
                            onChange={(id) => updateCustomRecipient(idx, id)}
                            excludeOfficeIds={customSelectedIds.filter(
                              (id) => id !== val,
                            )}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomRecipient(idx)}
                          disabled={loading}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[11px] text-slate-500">
                    Minimum 1 recipient. Maximum {MAX_CUSTOM}.
                  </p>
                </div>
              )}

              {error && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const err = validateStep1();
                    if (err) {
                      setError(err);
                      return;
                    }
                    setError(null);
                    setStep(2);
                  }}
                  disabled={loading}
                >
                  Next →
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-0">
          {/* Left: form */}
          <div className="lg:col-span-7 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100">
              <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
                {/* Back to Step 1 */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Flow:{" "}
                    <span className="font-semibold text-slate-700">
                      {routingMode === "default"
                        ? isQA
                          ? "Default QA Flow"
                          : "Default Office Flow"
                        : "Custom Flow"}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    ← Back to flow setup
                  </Button>
                </div>

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

                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Participants are already set in Step 1. You can go back if
                    needed.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short summary of what this document is for (shown in Library later)."
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    This is not comments; comments will live in DocumentFlow.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Effective date
                    </label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      disabled={!isQA}
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:bg-slate-50 disabled:opacity-60"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      {isQA
                        ? "QA can set this on draft creation."
                        : "Only QA can set effective date."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Tags
                    </label>

                    <div className="flex gap-2">
                      <input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="Type a tag and press Add (e.g., SOP, QMS, HR)"
                        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const t = tagsInput.trim();
                          if (!t) return;
                          if (
                            tags.some(
                              (x) => x.toLowerCase() === t.toLowerCase(),
                            )
                          )
                            return;
                          setTags((prev) => [...prev, t]);
                          setTagsInput("");
                        }}
                      >
                        Add
                      </Button>
                    </div>

                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                            title="Remove tag"
                            onClick={() =>
                              setTags((prev) => prev.filter((x) => x !== t))
                            }
                          >
                            {t} ×
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="mt-1 text-[11px] text-slate-500">
                      UI only for now; we’ll connect this to document_tag later.
                    </p>
                  </div>
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
                        {Object.entries(fieldErrors).map(
                          ([field, messages]) => (
                            <li key={field}>
                              <span className="font-semibold">{field}</span>
                              {": "}
                              {messages.join(" ")}
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3">
                  <p className="text-[11px] text-slate-500">
                    Saved documents will appear in your Document Library.
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:opacity-60"
                  >
                    {loading ? "Saving…" : "Save document"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: preview */}
          <aside className="lg:col-span-5 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/80">
                <div className="text-sm font-semibold tracking-tight text-slate-900">
                  Preview
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Preview is generated on upload (PDF is quick; Office converts
                  to PDF).
                </div>
              </div>

              <div className="p-5">
                {!file ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600 text-center">
                    Choose a file to generate a preview.
                  </div>
                ) : previewLoading ? (
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                    Generating preview…
                    <div className="mt-2 text-xs text-slate-500">
                      Office files may take a few seconds to convert.
                    </div>
                  </div>
                ) : previewError ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
                    {previewError}
                    <div className="mt-2 text-xs text-rose-700">
                      You can still save the document even if preview fails.
                    </div>
                  </div>
                ) : tempPreview?.url ? (
                  <div className="h-[70vh] min-h-105 w-full overflow-hidden rounded-md border border-slate-200 bg-white">
                    <iframe
                      title="Document preview"
                      src={tempPreview.url}
                      className="h-full w-full"
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                    Preview not available yet.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </PageFrame>
  );
};

export default CreateDocumentPage;
