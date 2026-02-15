import React, { useEffect, useState } from "react";
import {
  getDocument,
  getDocumentVersions,
  getDocumentVersion,
  createRevision,
  logOpenedVersion,
  type Document,
  type DocumentVersion,
} from "../services/documents";
import DocumentFlow from "../components/documents/DocumentFlow";
import ShareDocumentModal from "../components/documents/ShareDocumentModal";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import InlineSpinner from "../components/ui/loader/InlineSpinner";
import SplitFrame from "../components/layout/SplitFrame";
import Skeleton from "../components/ui/loader/Skeleton";

const DocumentFlowPage: React.FC = () => {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/documents");
  };

  if (!params.id || Number.isNaN(id)) {
    return (
      <div className="flex flex-col gap-3">
        <Button type="button" variant="outline" size="sm" onClick={handleBack}>
          ← Back
        </Button>

        <Alert variant="danger">Invalid document id.</Alert>
      </div>
    );
  }

  const [document, setDocument] = useState<Document | null>(null);
  const [allVersions, setAllVersions] = useState<DocumentVersion[]>([]);
  const [headerState, setHeaderState] = useState<{
    title: string;
    code: string;
    status: string;
    versionNumber: number;
    headerActions: any[];
    versionActions: any[];
  } | null>(null);

  const headerSigRef = React.useRef<string>("");

  const [selectedVersion, setSelectedVersion] =
    useState<DocumentVersion | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true); // first load only
  const hasData = !!document && !!selectedVersion;
  const selectedVersionParam = searchParams.get("version_id");
  const selectedVersionIdFromUrl = selectedVersionParam
    ? Number(selectedVersionParam)
    : null;
  const selectedVersionId =
    selectedVersionIdFromUrl && !Number.isNaN(selectedVersionIdFromUrl)
      ? selectedVersionIdFromUrl
      : null;
  const [isLoadingSelectedVersion, setIsLoadingSelectedVersion] =
    useState(false);

  // Stores what the user last clicked (for nicer "Loading vX..." text)
  const [targetVersionId, setTargetVersionId] = useState<number | null>(null);
  const [targetVersionNumber, setTargetVersionNumber] = useState<
    number | string | null
  >(null);

  const [error, setError] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);

  const refreshAndSelectBest = React.useCallback(
    async (opts?: { preferVersionId?: number | null }) => {
      const [docData, versions] = await Promise.all([
        getDocument(id),
        getDocumentVersions(id),
      ]);

      const sorted = [...versions].sort(
        (a, b) => Number(b.version_number) - Number(a.version_number),
      );

      setDocument(docData);
      setAllVersions(sorted);

      const preferId = opts?.preferVersionId ?? null;

      const best =
        (preferId ? sorted.find((v) => v.id === preferId) : null) ??
        sorted[0] ??
        null;

      setSelectedVersion(best);

      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (best) p.set("version_id", String(best.id));
        else p.delete("version_id");

        // Back-compat cleanup: remove old param if it exists
        p.delete("version");

        return p;
      });
    },
    [id, setSearchParams],
  );

  // 1) Initial load: document + versions list (only when id changes)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setError(null);
      setLoading(true);

      try {
        const [docData, versions] = await Promise.all([
          getDocument(id),
          getDocumentVersions(id),
        ]);
        if (!alive) return;

        const sorted = [...versions].sort(
          (a, b) => Number(b.version_number) - Number(a.version_number),
        );

        setDocument(docData);
        setAllVersions(sorted);

        // Choose initial selection: URL version if present, else latest
        const best =
          (selectedVersionId
            ? sorted.find((v) => v.id === selectedVersionId)
            : null) ??
          sorted[0] ??
          null;

        setSelectedVersion(best);

        setSearchParams((prev) => {
          const p = new URLSearchParams(prev);
          if (best) p.set("version_id", String(best.id));
          else p.delete("version_id");
          p.delete("version");
          return p;
        });
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? "Failed to load document");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
    // only when doc id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 2) When URL version_id changes: fetch that version details only
  useEffect(() => {
    let alive = true;

    const loadVersion = async () => {
      if (!selectedVersionId) return;

      // If we already have that version selected, don’t refetch
      if (selectedVersion?.id === selectedVersionId) return;

      setIsLoadingSelectedVersion(true);
      setError(null);

      try {
        const { version, document: docRes } =
          await getDocumentVersion(selectedVersionId);
        if (!alive) return;
        setSelectedVersion(version);
        setDocument(docRes);
      } catch (e: any) {
        if (!alive) return;
        const status = e?.response?.status;

        if (status === 404) {
          // remove bad param so we don't keep retrying the deleted version
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.delete("version_id");
            p.delete("version");
            return p;
          });
        } else {
          setError(e?.message ?? "Failed to load version");
        }
      } finally {
        if (!alive) return;
        setIsLoadingSelectedVersion(false);
        setTargetVersionId(null);
        setTargetVersionNumber(null);
      }
    };

    loadVersion();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionId]);

  if (loading && !hasData) {
    return (
      <>
        <SplitFrame
          title={
            <div className="flex items-center gap-2 min-w-0">
              {" "}
              <Skeleton className="h-5 w-56" />{" "}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                {" "}
                v…{" "}
              </span>{" "}
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                {" "}
                Loading…{" "}
              </span>{" "}
            </div>
          }
          subtitle={<Skeleton className="h-4 w-40" />}
          right={
            <div className="flex flex-wrap justify-end gap-2">
              {" "}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
              >
                {" "}
                ← Back{" "}
              </Button>{" "}
            </div>
          }
          rightTitle="Versions"
          rightSubtitle="Loading…"
          rightWidthClassName="w-[340px]"
          left={
            <div className="mx-auto w-full max-w-5xl space-y-4">
              {" "}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                {" "}
                <Skeleton className="h-5 w-52" />{" "}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {" "}
                  <Skeleton className="h-14 w-full rounded-xl" />{" "}
                  <Skeleton className="h-14 w-full rounded-xl" />{" "}
                  <Skeleton className="h-14 w-full rounded-xl" />{" "}
                </div>{" "}
              </div>{" "}
              <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
                {" "}
                <div className="space-y-4">
                  {" "}
                  <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                    {" "}
                    <Skeleton className="h-6 w-64" />{" "}
                    <Skeleton className="mt-2 h-4 w-32" />{" "}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {" "}
                      <Skeleton className="h-4 w-full" />{" "}
                      <Skeleton className="h-4 w-full" />{" "}
                      <Skeleton className="h-4 w-full" />{" "}
                      <Skeleton className="h-4 w-full" />{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                    {" "}
                    <Skeleton className="h-56 w-full rounded-xl" />{" "}
                  </div>{" "}
                </div>{" "}
                <div className="space-y-3">
                  {" "}
                  <Skeleton className="h-4 w-40" />{" "}
                  <div className="h-150 w-full rounded-xl border-2 border-slate-200 bg-white" />{" "}
                </div>{" "}
              </div>{" "}
            </div>
          }
          rightPanel={
            <div className="space-y-2">
              {" "}
              <Skeleton className="h-16 w-full rounded-xl" />{" "}
              <Skeleton className="h-16 w-full rounded-xl" />{" "}
              <Skeleton className="h-16 w-full rounded-xl" />{" "}
            </div>
          }
        />

        <ShareDocumentModal
          open={shareOpen}
          documentId={document?.id ?? null}
          onClose={() => setShareOpen(false)}
          onSaved={() => {
            // no-op for now; later you can show a toast
          }}
        />
      </>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col gap-3">
        <Button type="button" variant="outline" size="sm" onClick={handleBack}>
          ← Back
        </Button>
        <Alert variant="danger">{error ?? "Document not found."}</Alert>
      </div>
    );
  }

  // Show revise for LATEST Distributed version (v0.0, v1.0, v2.0...)
  const current = selectedVersion ?? allVersions[0] ?? null;

  const isLatestSelected = current
    ? !allVersions.some(
        (v) => Number(v.version_number) > Number(current.version_number),
      )
    : false;

  const isRevisable = isLatestSelected && current?.status === "Distributed";

  // UI

  return (
    <>
      <SplitFrame
        title={
          <div className="min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <span className="min-w-0 whitespace-normal wrap-break-word leading-snug">
                {headerState?.title ?? document.title}
              </span>

              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  v
                  {headerState?.versionNumber ?? current?.version_number ?? "-"}
                </span>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  {headerState?.status ?? current?.status ?? "-"}
                </span>
              </div>
            </div>
          </div>
        }
        subtitle={
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {headerState?.code ?? document.code ?? "CODE-NOT-AVAILABLE"}
          </span>
        }
        right={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={isLoadingSelectedVersion}
            >
              ← Back
            </Button>

            {current?.status === "Distributed" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoadingSelectedVersion}
                onClick={() => setShareOpen(true)}
              >
                Share
              </Button>
            )}

            {isRevisable && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isLoadingSelectedVersion}
                onClick={async () => {
                  try {
                    const revised = await createRevision(document.id);

                    setAllVersions((prev) => {
                      const next = [
                        revised,
                        ...prev.filter((v) => v.id !== revised.id),
                      ];
                      next.sort(
                        (a, b) =>
                          Number(b.version_number) - Number(a.version_number),
                      );
                      return next;
                    });

                    setSelectedVersion(revised);
                    setSearchParams((prev) => {
                      const p = new URLSearchParams(prev);
                      p.set("version_id", String(revised.id));
                      p.delete("version"); // cleanup old param too
                      return p;
                    });
                  } catch (e: any) {
                    alert(`Revision failed: ${e.message}`);
                  }
                }}
              >
                Revise
              </Button>
            )}

            {(headerState?.headerActions ?? []).map((a: any) => (
              <Button
                key={a.key}
                type="button"
                size="sm"
                variant={a.variant === "danger" ? "danger" : "primary"}
                disabled={a.disabled || isLoadingSelectedVersion}
                onClick={a.onClick}
              >
                {a.label}
              </Button>
            ))}

            {(headerState?.versionActions ?? []).map((a: any) => (
              <Button
                key={a.key}
                type="button"
                size="sm"
                variant={
                  a.variant === "danger"
                    ? "danger"
                    : a.variant === "outline"
                      ? "outline"
                      : "secondary"
                }
                onClick={a.onClick}
                disabled={isLoadingSelectedVersion}
              >
                {a.label}
              </Button>
            ))}
          </div>
        }
        rightTitle="Versions"
        rightSubtitle={`${allVersions.length} total`}
        rightWidthClassName="w-[360px] max-w-[45vw]"
        left={
          <div className="relative">
            {selectedVersion ? (
              <DocumentFlow
                document={document}
                version={selectedVersion}
                onHeaderStateChange={(s) => {
                  // DO NOT include function identity in signature; only compare stable fields
                  const sig =
                    `${s.title}|${s.code}|${s.status}|${s.versionNumber}|${s.canAct}|` +
                    `${(s.headerActions ?? []).map((a) => `${a.key}:${a.disabled ? 1 : 0}:${a.variant}`).join(",")}|` +
                    `${(s.versionActions ?? []).map((a) => `${a.key}:${a.disabled ? 1 : 0}:${a.variant}`).join(",")}`;

                  if (sig === headerSigRef.current) return;
                  headerSigRef.current = sig;

                  setHeaderState(s);
                }}
                onAfterActionClose={async () => {
                  // If v0 draft was deleted, backend soft-deletes the whole document family.
                  // Detect that by attempting to refetch the document; if it 404s, go back to library.
                  try {
                    await getDocument(id);
                  } catch (e: any) {
                    // If the document is gone, leave this page.
                    navigate("/documents");
                    return;
                  }

                  // Otherwise, just refresh versions and keep a valid selection.
                  await refreshAndSelectBest();
                }}
                onChanged={async () => {
                  // Keep list + selection consistent after any action
                  await refreshAndSelectBest({
                    preferVersionId: selectedVersion?.id ?? null,
                  });
                }}
              />
            ) : (
              <Alert variant="warning">No version available.</Alert>
            )}

            {(isLoadingSelectedVersion || (loading && hasData)) && (
              <div className="absolute inset-0 rounded-xl bg-white/50 backdrop-blur-[1px] flex items-start justify-end p-3 pointer-events-none">
                <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-700 shadow-sm">
                  <InlineSpinner className="h-3 w-3 border-2" />
                  {targetVersionNumber != null
                    ? `Loading v${targetVersionNumber}…`
                    : "Loading…"}
                </div>
              </div>
            )}
          </div>
        }
        rightPanel={
          <div className="space-y-2">
            {allVersions.map((v) => {
              const isSelected = v.id === selectedVersion?.id;

              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={isLoadingSelectedVersion}
                  onClick={() => {
                    setTargetVersionId(v.id);
                    setTargetVersionNumber(v.version_number);

                    setSearchParams((prev) => {
                      const p = new URLSearchParams(prev);
                      p.set("version_id", String(v.id));
                      return p;
                    });

                    // Read-action log (B): per click, deduped server-side
                    logOpenedVersion(v.id, "versions_panel");
                  }}
                  className={[
                    "w-full rounded-xl border px-3 py-2 text-left transition relative",
                    isSelected
                      ? "border-sky-300 bg-white shadow-sm"
                      : "border-slate-200 bg-white/70 hover:bg-white",
                    isLoadingSelectedVersion
                      ? "opacity-70 cursor-not-allowed"
                      : "",
                  ].join(" ")}
                  aria-current={isSelected ? "true" : undefined}
                >
                  {isSelected && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-sky-500" />
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-xs font-semibold text-slate-900">
                        v{v.version_number}
                      </p>
                      {isLoadingSelectedVersion && targetVersionId === v.id && (
                        <InlineSpinner className="h-3 w-3 border-2" />
                      )}
                    </div>

                    <span
                      className="max-w-35 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                      title={v.status}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                    <div>
                      Created: {new Date(v.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      Updated: {new Date(v.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        }
      />

      <ShareDocumentModal
        open={shareOpen}
        documentId={document?.id ?? null}
        onClose={() => setShareOpen(false)}
        onSaved={() => {
          // optional: toast later
        }}
      />
    </>
  );
};

export default DocumentFlowPage;
