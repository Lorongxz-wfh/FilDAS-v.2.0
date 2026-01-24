import React, { useEffect, useState } from "react";
import { listDocuments } from "../../services/documents";
import type { Document } from "../../services/documents";
import { useNavigate } from "react-router-dom";
import Table, { type TableColumn } from "../components/ui/Table";
import PageHeading from "../components/ui/PageHeading";
import Button from "../components/ui/Button";

interface DocumentsListPageProps {
  documents?: Document[]; // Optional prop for filtered data
}

const DocumentsListPage: React.FC<DocumentsListPageProps> = ({ documents }) => {
  const navigate = useNavigate();

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

  return (
    <section className="space-y-4">
      <PageHeading
        title="Documents"
        right={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate("/documents/create")}
          >
            Create document
          </Button>
        }
      />

      {(() => {
        const columns: TableColumn<Document>[] = [
          { key: "title", header: "Title", render: (d) => d.title },
          { key: "code", header: "Code", render: (d) => d.code || "—" },
          { key: "type", header: "Type", render: (d) => d.doctype },
          { key: "status", header: "Status", render: (d) => d.status },
          {
            key: "version",
            header: "Version",
            render: (d) => d.version_number,
            align: "right",
          },
          {
            key: "created",
            header: "Created",
            render: (d) => new Date(d.created_at).toLocaleDateString(),
            className: "text-xs text-slate-500",
          },
        ];

        return (
          <Table<Document>
            columns={columns}
            rows={displayDocuments}
            rowKey={(d) => d.id}
            onRowClick={(d) => navigate(`/documents/${d.id}`)}
            loading={loading}
            error={error}
            emptyMessage='There are no documents yet. Try creating one from the "Create document" page.'
          />
        );
      })()}
    </section>
  );
};

export default DocumentsListPage;
