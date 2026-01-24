import React, { useEffect, useState } from "react";
import { getDocument, getDocumentVersions } from "../../services/documents";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import type { Document } from "../../services/documents";
import DocumentFlow from "./DocumentFlow";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import { Card, CardHeader } from "../components/ui/Card";
import Alert from "../components/ui/Alert";

const DocumentFlowPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const id = Number(params.id);

  if (!params.id || Number.isNaN(id)) {
    return <Alert variant="danger">Invalid document id.</Alert>;
  }

  const [document, setDocument] = useState<Document | null>(null);
  const [allVersions, setAllVersions] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = "http://localhost:8000/api";

  function getRole(): string {
    try {
      const raw = localStorage.getItem("auth_user");
      if (!raw) return "";
      const user = JSON.parse(raw);
      return String(user?.role ?? "");
    } catch {
      return "";
    }
  }

  async function createRevision(docId: number): Promise<Document> {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_BASE}/documents/${docId}/revision`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed (${response.status})`);
    }
    return (await response.json()) as Document;
  }

  async function cancelRevision(docId: number): Promise<Document> {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(
      `${API_BASE}/documents/${docId}/cancel-revision`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed (${response.status})`);
    }

    const json = await response.json();
    return (json?.data ?? json) as Document;
  }

  async function downloadDistributed(doc: Document): Promise<void> {
    const token = localStorage.getItem("auth_token");
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE}/documents/${doc.id}/download`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Download failed (${res.status})`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = window.document.createElement("a");
    a.href = url;
    a.download = doc.original_filename || `document-${doc.id}`;
    window.document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDocument(id);
        setDocument(data);

        // Fetch versions immediately using new endpoint
        const rootId = data.parent_document_id || data.id;
        const versions = await getDocumentVersions(rootId);
        const sorted = [...versions].sort(
          (a, b) => Number(b.version_number) - Number(a.version_number),
        );
        setAllVersions(sorted);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading document version..." />;
  }

  if (error || !document) {
    return <Alert variant="danger">{error ?? "Document not found."}</Alert>;
  }

  // Show revise for LATEST Distributed version (v0.0, v1.0, v2.0...)
  const isLatestVersion = !allVersions.some(
    (v) => Number(v.version_number) > Number(document.version_number),
  );
  const isRevisable = isLatestVersion && document.status === "Distributed";

  return (
    <div className="flex h-full gap-6">
      {/* LEFT/CENTER: Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header WITH REVISION BUTTON */}
        <Card className="mb-6">
          <CardHeader>
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
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {document.status === "Distributed" && document.file_path && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await downloadDistributed(document);
                      } catch (e: any) {
                        alert(e.message || "Download failed");
                      }
                    }}
                  >
                    Download
                  </Button>
                )}

                {document.status === "Revision-Draft" && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Cancel this revision draft?")) return;

                      try {
                        const restored = await cancelRevision(document.id);
                        navigate(`/documents/${restored.id}`, {
                          replace: true,
                        });
                      } catch (e: any) {
                        alert(e.message || "Cancel revision failed");
                      }
                    }}
                  >
                    Cancel revision
                  </Button>
                )}

                {isRevisable && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        const revised = await createRevision(document.id);
                        navigate(`/documents/${revised.id}`);
                      } catch (e: any) {
                        alert(`Revision failed: ${e.message}`);
                      }
                    }}
                  >
                    Revise Document
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Document Flow */}
        <div className="flex-1 overflow-y-auto">
          <DocumentFlow
            document={document}
            onChanged={async () => {
              const latest = await getDocument(document.id);
              setDocument(latest);

              const rootId = latest.parent_document_id || latest.id;
              const versions = await getDocumentVersions(rootId);
              const sorted = [...versions].sort(
                (a, b) => Number(b.version_number) - Number(a.version_number),
              );
              setAllVersions(sorted);
            }}
            onDeleted={async (deletedId: number) => {
              const role = getRole();

              // If deleted doc is a revision, load previous version in-place
              const idx = allVersions.findIndex((v) => v.id === deletedId);
              if (idx > 0) {
                const prev = allVersions[idx - 1];
                setLoading(true);
                try {
                  const prevDoc = await getDocument(prev.id);
                  setDocument(prevDoc);
                  const rootId = prevDoc.parent_document_id || prevDoc.id;
                  const versions = await getDocumentVersions(rootId);
                  const sorted = [...versions].sort(
                    (a, b) =>
                      Number(b.version_number) - Number(a.version_number),
                  );
                  setAllVersions(sorted);

                  navigate(`/documents/${prev.id}`, { replace: true });
                } finally {
                  setLoading(false);
                }
                return;
              }

              // Root draft deleted → go back to appropriate list
              if (role === "qa") {
                navigate("/documents");
              } else {
                navigate("/documents-approvals");
              }
            }}
          />
        </div>
      </div>

      {/* RIGHT: Versions panel */}
      <div className="w-56 shrink-0 ml-4 border-l border-slate-200">
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
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const docData = await getDocument(v.id);
                      setDocument(docData);
                      navigate(`/documents/${v.id}`, { replace: true });
                    } catch (error) {
                      alert("Failed to load document version");
                    } finally {
                      setLoading(false);
                    }
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
