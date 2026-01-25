import React, { useEffect, useState } from "react";
import {
  getDocument,
  getDocumentVersions,
  getDocumentVersion,
  type DocumentVersion,
} from "../../services/documents";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import type { Document } from "../../services/documents";
import DocumentFlow from "./DocumentFlow";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import { downloadDocument } from "../../services/documents";
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
  const [allVersions, setAllVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersion, setSelectedVersion] =
    useState<DocumentVersion | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
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

  async function createRevision(docId: number): Promise<DocumentVersion> {
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

    return (await response.json()) as DocumentVersion;
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
          const { version } = await getDocumentVersion(qpId);
          setSelectedVersion(version);
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

  if (loading) {
    return <LoadingSpinner message="Loading document version..." />;
  }

  if (error || !document) {
    return <Alert variant="danger">{error ?? "Document not found."}</Alert>;
  }

  // Show revise for LATEST Distributed version (v0.0, v1.0, v2.0...)
  const current = selectedVersion ?? allVersions[0] ?? null;

  const isLatestSelected = current
    ? !allVersions.some(
        (v) => Number(v.version_number) > Number(current.version_number),
      )
    : false;

  const isRevisable = isLatestSelected && current?.status === "Distributed";

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
                    v
                    {selectedVersion?.version_number ?? document.version_number}{" "}
                    <span className="ml-1 font-semibold text-slate-900">
                      ({selectedVersion?.status ?? document.status}){" "}
                    </span>
                  </span>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {selectedVersion?.status === "Distributed" &&
                  selectedVersion.file_path && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await downloadDocument(selectedVersion);
                        } catch (e: any) {
                          alert(e.message || "Download failed");
                        }
                      }}
                    >
                      Download
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

                        // set selected version in URL and state
                        setSearchParams((prev) => {
                          const p = new URLSearchParams(prev);
                          p.set("version", String(revised.id));
                          return p;
                        });
                        setSelectedVersion(revised);
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
          {selectedVersion ? (
            <DocumentFlow
              document={document}
              version={selectedVersion}
              onChanged={async () => {
                const latest = await getDocument(document.id);
                setDocument(latest);

                const versions = await getDocumentVersions(document.id);
                const sorted = [...versions].sort(
                  (a, b) => Number(b.version_number) - Number(a.version_number),
                );
                setAllVersions(sorted);
              }}
            />
          ) : (
            <Alert variant="warning">No version available.</Alert>
          )}
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
                    // Update query param only; keep same document id route
                    setSearchParams((prev) => {
                      const p = new URLSearchParams(prev);
                      p.set("version", String(v.id));
                      return p;
                    });

                    setSelectedVersion(v);
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
  );
};

export default DocumentFlowPage;
