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
  const [selectedVersion, setSelectedVersion] =
    useState<DocumentVersion | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
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
    <div className="relative flex h-full min-h-0 overflow-hidden">
      <div className="absolute left-2 top-2 z-10">{BackButton}</div>

      <div className="flex flex-1 min-h-0 gap-6 overflow-hidden pt-2">
        {/* LEFT/CENTER: Main content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header WITH REVISION BUTTON */}

          {/* Small toolbar (page-level actions) */}
          {isRevisable && (
            <div className="mb-3 flex items-center justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    const revised = await createRevision(document.id);

                    // Update versions panel immediately (no refetch)
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

                    // Switch to the new revision version
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
                Revise Document
              </Button>
            </div>
          )}

          {/* Document Flow */}
          <div className="flex-1 overflow-y-auto">
            {selectedVersion ? (
              <DocumentFlow
                document={document}
                version={selectedVersion}
                onChanged={async () => {
                  if (!document) return;

                  // 1) Always refresh versions list first
                  const versions = await getDocumentVersions(document.id);
                  const sorted = [...versions].sort(
                    (a, b) =>
                      Number(b.version_number) - Number(a.version_number),
                  );

                  setAllVersions(sorted);

                  const currentId = selectedVersion?.id;
                  const stillExists = currentId
                    ? sorted.some((v) => v.id === currentId)
                    : false;

                  // 2) If the selected version still exists, reload it
                  if (currentId && stillExists) {
                    const { version: freshVersion, document: freshDoc } =
                      await getDocumentVersion(currentId);
                    setSelectedVersion(freshVersion);
                    setDocument(freshDoc);
                    return;
                  }

                  // 3) Otherwise fallback to latest version (or null)
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
        {/* RIGHT: Versions panel */}
        <div className="w-56 shrink-0 ml-4 border-l border-slate-200 h-full min-h-0">
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
                Document Versions
              </h3>
              <div className="space-y-2">
                {allVersions.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={async () => {
                      try {
                        setLoading(true);

                        // Update query param only; keep same document id route
                        setSearchParams((prev) => {
                          const p = new URLSearchParams(prev);
                          p.set("version", String(v.id));
                          return p;
                        });

                        // Load the selected version + document from backend (authoritative)
                        const { version, document: docRes } =
                          await getDocumentVersion(v.id);
                        setSelectedVersion(version);
                        setDocument(docRes);
                      } catch (e: any) {
                        alert(e.message || "Failed to load version");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${
                      v.id === selectedVersion?.id
                        ? "bg-sky-100 text-sky-900 font-semibold border border-sky-200"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-medium">v{v.version_number}</p>
                    <p className="text-[10px] text-slate-500">{v.status}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentFlowPage;
