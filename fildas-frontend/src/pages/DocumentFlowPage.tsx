import React, { useEffect, useState } from "react";
import {
  getDocument,
  getDocumentVersions,
  getDocumentVersion,
  createRevision,
  type Document,
  type DocumentVersion,
} from "../services/documents";
import LoadingSpinner from "../components/ui/loader/LoadingSpinner";
import DocumentFlow from "../components/documents/DocumentFlow";
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

  const [selectedVersion, setSelectedVersion] =
    useState<DocumentVersion | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true); // first load only
  const hasData = !!document && !!selectedVersion;
const selectedVersionParam = searchParams.get("version");
const [isLoadingSelectedVersion, setIsLoadingSelectedVersion] = useState(false);


  // Stores what the user last clicked (for nicer "Loading vX..." text)
  const [targetVersionId, setTargetVersionId] = useState<number | null>(null);
  const [targetVersionNumber, setTargetVersionNumber] = useState<
    number | string | null
  >(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let seq = Date.now(); // simple unique marker for this run

    const load = async () => {
      // Only show the big loading state if we have nothing to render yet
      if (!document || !selectedVersion) setLoading(true);
      setError(null);

      if (selectedVersionParam) setIsLoadingSelectedVersion(true);

      try {
        const qp = searchParams.get("version");
        const qpId = qp ? Number(qp) : NaN;

        // Always refresh versions list (right panel) in the background
        const [docData, versions] = await Promise.all([
          getDocument(id),
          getDocumentVersions(id),
        ]);
        if (!alive) return;

        setDocument(docData);

        const sorted = [...versions].sort(
          (a, b) => Number(b.version_number) - Number(a.version_number),
        );
        setAllVersions(sorted);

        // If query param exists, load that version details
        if (qp && !Number.isNaN(qpId)) {
          const { version, document: docRes } = await getDocumentVersion(qpId);
          if (!alive) return;
          setSelectedVersion(version);
          setDocument(docRes);
          return;
        }

        // No query param: ensure we have a selected version (keep current if possible)
        setSelectedVersion((prev) => {
          if (prev && sorted.some((v) => v.id === prev.id)) return prev;
          return sorted[0] ?? null;
        });
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? "Failed to load document");
      } finally {
        if (!alive) return;
        setLoading(false);
        setIsLoadingSelectedVersion(false);
        setTargetVersionId(null);
        setTargetVersionNumber(null);
      }
    };

    load();

    return () => {
      alive = false;
      void seq;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams.toString()]);

  if (loading && !hasData) {
    return (
      <SplitFrame
        title={
          <div className="flex items-center gap-2 min-w-0">
            <Skeleton className="h-5 w-56" />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
              v…
            </span>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-300">
              Loading…
            </span>
          </div>
        }
        subtitle={<Skeleton className="h-4 w-40" />}
        right={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
            >
              ← Back
            </Button>
          </div>
        }
        rightTitle="Versions"
        rightSubtitle="Loading…"
        rightWidthClassName="w-[340px]"
        left={
          <div className="mx-auto w-full max-w-5xl space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-5 w-52" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="mt-2 h-4 w-32" />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                  <Skeleton className="h-56 w-full rounded-xl" />
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <div className="h-150 w-full rounded-xl border-2 border-slate-200 bg-white" />
              </div>
            </div>
          </div>
        }
        rightPanel={
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        }
      />
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
    <SplitFrame
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">
            {headerState?.title ?? document.title}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            v{headerState?.versionNumber ?? current?.version_number ?? "-"}
          </span>
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
            {headerState?.status ?? current?.status ?? "-"}
          </span>
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
                    p.set("version", String(revised.id));
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
        </div>
      }
      rightTitle="Versions"
      rightSubtitle={`${allVersions.length} total`}
      rightWidthClassName="w-[340px]"
      left={
        <div className="relative">
          {selectedVersion ? (
            <DocumentFlow
              document={document}
              version={selectedVersion}
              onHeaderStateChange={setHeaderState}
              onChanged={async () => {
                if (!document) return;

                let versions: DocumentVersion[] = [];
                try {
                  versions = await getDocumentVersions(document.id);
                } catch (e: any) {
                  navigate("/documents");
                  return;
                }

                const sorted = [...versions].sort(
                  (a, b) => Number(b.version_number) - Number(a.version_number),
                );

                setAllVersions(sorted);

                if (sorted.length === 0) {
                  navigate("/documents");
                  return;
                }

                const currentId = selectedVersion?.id;
                const stillExists = currentId
                  ? sorted.some((v) => v.id === currentId)
                  : false;

                if (currentId && stillExists) {
                  const { version: freshVersion, document: freshDoc } =
                    await getDocumentVersion(currentId);
                  setSelectedVersion(freshVersion);
                  setDocument(freshDoc);
                  return;
                }

                const next = sorted[0] ?? null;
                setSelectedVersion(next);

                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  if (next) p.set("version", String(next.id));
                  else p.delete("version");
                  return p;
                });

                if (next) {
                  const { document: freshDoc } = await getDocumentVersion(
                    next.id,
                  );
                  setDocument(freshDoc);
                }
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
                    p.set("version", String(v.id));
                    return p;
                  });
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

                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
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
  );
};

export default DocumentFlowPage;
