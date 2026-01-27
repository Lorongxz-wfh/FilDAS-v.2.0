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
  const [loading, setLoading] = useState(true);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDocument(id);
        setDocument(data);

        // Versions for this document family
        const versions = await getDocumentVersions(id);
        const sorted = [...versions].sort(
          (a, b) => Number(b.version_number) - Number(a.version_number),
        );
        setAllVersions(sorted);

        // Choose selected version from query param; fallback to latest version
        const qp = searchParams.get("version");
        const qpId = qp ? Number(qp) : NaN;

        if (qp && !Number.isNaN(qpId)) {
          const { version, document: docRes } = await getDocumentVersion(qpId);
          setSelectedVersion(version);
          setDocument(docRes);
        } else {
          setSelectedVersion(sorted[0] ?? null);
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, searchParams]);

  const BackButton = (
    <div className="p-0">
      <Button type="button" variant="outline" size="sm" onClick={handleBack}>
        ← Back
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div>
        {BackButton}
        <LoadingSpinner message="Loading document version..." />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div>
        {BackButton}
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
  // Make this page responsible for its own vertical layout
  // Cancel MainLayout <main> padding (py-8 and px-6/lg:px-8) so browser won't scroll
  <div className="-mx-6 -my-8 lg:-mx-8 flex min-h-0 flex-col overflow-hidden h-[calc(100vh-64px)]">
    {/* 2-column area INSIDE main: middle + right */}
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Middle column: toolbar + scrollable content */}
      <div className="min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar constrained to middle column only */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={isSwitchingVersion}
            >
              ← Back
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-slate-900">
                  {headerState?.title ?? document.title}
                </h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  v
                  {headerState?.versionNumber ?? current?.version_number ?? "-"}
                </span>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  {headerState?.status ?? current?.status ?? "-"}
                </span>
              </div>
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {headerState?.code ?? document.code ?? "CODE-NOT-AVAILABLE"}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {isRevisable && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isSwitchingVersion}
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
                  disabled={isSwitchingVersion}
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
                  disabled={a.disabled || isSwitchingVersion}
                  onClick={a.onClick}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle scroll area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
        </div>
      </div>

      {/* Right column: versions (scrollable) */}
      <div className="w-72 shrink-0 min-h-0 border-l border-slate-200 bg-slate-50/40 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Versions
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {allVersions.length} total
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {allVersions.map((v) => {
                const isSelected = v.id === selectedVersion?.id;

                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isSwitchingVersion}
                    onClick={async () => {
                      try {
                        setIsSwitchingVersion(true);

                        setSearchParams((prev) => {
                          const p = new URLSearchParams(prev);
                          p.set("version", String(v.id));
                          return p;
                        });

                        const { version, document: docRes } =
                          await getDocumentVersion(v.id);
                        setSelectedVersion(version);
                        setDocument(docRes);
                      } catch (e: any) {
                        alert(e.message || "Failed to load version");
                      } finally {
                        setIsSwitchingVersion(false);
                      }
                    }}
                    className={[
                      "w-full rounded-xl border px-3 py-2 text-left transition relative",
                      isSelected
                        ? "border-sky-300 bg-white shadow-sm"
                        : "border-slate-200 bg-white/70 hover:bg-white",
                      isSwitchingVersion ? "opacity-70 cursor-not-allowed" : "",
                    ].join(" ")}
                    aria-current={isSelected ? "true" : undefined}
                  >
                    {/* left accent for selected */}
                    {isSelected && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-sky-500" />
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-xs font-semibold text-slate-900">
                          v{v.version_number}
                        </p>
                        {isSwitchingVersion && isSelected && (
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
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default DocumentFlowPage;
