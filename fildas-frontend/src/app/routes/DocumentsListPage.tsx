import React, { useEffect, useState } from "react";
import { listDocuments } from "../../services/documents";
import type { Document } from "../../services/documents";

interface DocumentsListPageProps {
  onSelectDocument?: (id: number) => void;
  documents?: Document[]; // NEW: Optional prop for filtered data
}

const DocumentsListPage: React.FC<DocumentsListPageProps> = ({
  onSelectDocument,
  documents,
}) => {
  const [loadedDocuments, setLoadedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true); // ✅ ADD THIS
  const [error, setError] = useState<string | null>(null); // ✅ ADD THIS

  // Use prop OR loaded data (single source of truth)
  const displayDocuments = documents ?? loadedDocuments;

  useEffect(() => {
    // Only load if no prop passed (standalone mode)
    if (!documents) {
      const load = async () => {
        try {
          const data = await listDocuments();
          setLoadedDocuments(data);
        } catch (err: any) {
          setError(err?.message ?? "Failed to load documents");
        } finally {
          setLoading(false);
        }
      };
      load();
    } else {
      setLoading(false); // Prop provided = instant ready
    }
  }, [documents]); // Re-run if prop changes

  if (loading) {
    return <div className="text-sm text-slate-600">Loading documents…</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (displayDocuments.length === 0) {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Documents
        </h1>
        <p className="text-sm text-slate-600">
          There are no documents yet. Try creating one from the "Create
          document" page.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Documents
      </h1>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>

          <tbody>
            {displayDocuments.map((doc) => (
              <tr
                key={doc.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                onClick={() => onSelectDocument?.(doc.id)}
              >
                <td className="px-4 py-2">{doc.title}</td>
                <td className="px-4 py-2">{doc.code || "—"}</td>
                <td className="px-4 py-2">{doc.doctype}</td>
                <td className="px-4 py-2">{doc.status}</td>
                <td className="px-4 py-2">{doc.version_number}</td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DocumentsListPage;
