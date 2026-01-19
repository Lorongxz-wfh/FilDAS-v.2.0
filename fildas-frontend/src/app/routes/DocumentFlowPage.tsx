import React, { useEffect, useState } from "react";
import {
  getDocument,
  getDocumentPreviewUrl,
  getDocumentVersions,
} from "../../services/documents";
import type { Document } from "../../services/documents";
import DocumentFlow from "./DocumentFlow";

interface DocumentFlowPageProps {
  id: number;
}

const DocumentFlowPage: React.FC<DocumentFlowPageProps> = ({ id }) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [allVersions, setAllVersions] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = "http://localhost:8000/api";

  async function createRevision(docId: number): Promise<Document> {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(
      `${API_BASE}/documents/${docId}/create-revision`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) throw new Error("Failed to create revision");
    return (await response.json()) as Document;
  }

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDocument(id);
        setDocument(data);

        // Fetch all versions SAFELY
        const rootId = data.parent_document_id || data.id;
        // Load current doc FIRST, versions SECOND
        setAllVersions([data]); // Always safe fallback

        // Versions async AFTER
        setTimeout(async () => {
          try {
            const versions = await getDocumentVersions(rootId);
            setAllVersions(versions);
          } catch (e) {
            console.warn("Versions optional:", e);
          }
        }, 100);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return <div className="text-sm text-slate-600">Loading document…</div>;
  }

  if (error || !document) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error ?? "Document not found."}
      </div>
    );
  }

  // Check if this is the latest version
  const isLatestVersion =
    allVersions.length === 0 ||
    Number(document.version_number) ===
      Math.max(...allVersions.map((v) => Number(v.version_number)));

  return (
    <div className="flex h-full gap-6">
      {/* LEFT/CENTER: Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header WITH REVISION BUTTON */}
        <div className="rounded-xl border-b border-slate-200 bg-white px-6 py-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 truncate">
                {document.title}
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                  {document.code}
                </span>
                <span>
                  v{document.version_number}
                  <span className="ml-1 font-semibold text-slate-900">
                    ({document.status})
                  </span>
                </span>
              </div>
            </div>

            {/* Revision button in header */}
            {isLatestVersion && (
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-slate-700 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap flex-shrink-0 ml-auto"
                onClick={async () => {
                  try {
                    const revised = await createRevision(document.id);
                    window.location.href = `/?doc=${revised.id}`;
                  } catch (e) {
                    alert("Failed to create revision");
                  }
                }}
              >
                Revise Document
              </button>
            )}
          </div>
        </div>

        {/* Document Flow */}
        <div className="flex-1 overflow-y-auto">
          <DocumentFlow document={document} />
        </div>

      </div>

      {/* RIGHT: Versions panel */}
      <div className="w-56 flex-shrink-0 ml-4 border-l border-slate-200">
        <div className="h-[calc(100vh-12rem)] overflow-y-auto p-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
              Document Versions
            </h3>
            <div className="space-y-2">
              {allVersions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    window.location.href = `/?doc=${v.id}`;
                  }}
                  className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${
                    v.id === document.id
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
  );
};

export default DocumentFlowPage;
