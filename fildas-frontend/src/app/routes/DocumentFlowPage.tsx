import React, { useEffect, useState } from "react";
import { getDocument } from "../../services/documents";
import type { Document } from "../../services/documents";
import DocumentFlow from "./DocumentFlow";

interface DocumentFlowPageProps {
  id: number;
}

const DocumentFlowPage: React.FC<DocumentFlowPageProps> = ({ id }) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDocument(id);
        setDocument(data);
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

  return <DocumentFlow document={document} />;
};

export default DocumentFlowPage;
