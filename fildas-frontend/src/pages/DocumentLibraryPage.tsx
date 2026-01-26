import React, { useEffect, useMemo, useState } from "react";
import { listDocuments, getCurrentUserOfficeId } from "../services/documents";
import type { Document } from "../services/documents";
import { useNavigate } from "react-router-dom";
import Table, { type TableColumn } from "../components/ui/Table";
import PageHeading from "../components/ui/PageHeading";
import Button from "../components/ui/Button";
import { getUserRole, isDepartment, isQA } from "../lib/roleFilters";

interface DocumentLibraryPageProps {
  documents?: Document[]; // Optional prop for filtered data
}

const DocumentLibraryPage: React.FC<DocumentLibraryPageProps> = ({
  documents,
}) => {
  const navigate = useNavigate();

  const [loadedDocuments, setLoadedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true); // ✅ ADD THIS
  const [error, setError] = useState<string | null>(null); // ✅ ADD THIS
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Use prop OR loaded data (single source of truth)
  const displayDocumentsRaw = documents ?? loadedDocuments;

  const role = getUserRole();
  const myOfficeId = getCurrentUserOfficeId();

  const displayDocuments = isDepartment(role)
    ? displayDocumentsRaw.filter(
        (d) => Number(d.office_id) === Number(myOfficeId),
      )
    : displayDocumentsRaw;

  const latestDocuments = useMemo(() => {
    const byFamily = new Map<number, Document>();

    for (const d of displayDocuments) {
      const familyId = Number(d.parent_document_id ?? d.id);
      const existing = byFamily.get(familyId);

      if (!existing) {
        byFamily.set(familyId, d);
        continue;
      }

      const better =
        Number(d.version_number) > Number(existing.version_number) ||
        (Number(d.version_number) === Number(existing.version_number) &&
          String(d.updated_at) > String(existing.updated_at));

      if (better) byFamily.set(familyId, d);
    }

    return Array.from(byFamily.values()).sort(
      (a, b) => Number(b.version_number) - Number(a.version_number),
    );
  }, [displayDocuments]);

  const statusOptions = useMemo(() => {
    if (loading) return ["ALL"];

    const s = new Set<string>();
    for (const d of latestDocuments) s.add(d.status);
    return ["ALL", ...Array.from(s).sort()];
  }, [latestDocuments, loading]);

  useEffect(() => {
    if (loading) return;
    if (!statusOptions.includes(statusFilter)) setStatusFilter("ALL");
  }, [loading, statusOptions, statusFilter]);

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();

    return latestDocuments.filter((d) => {
      const matchesQuery =
        query.length === 0 ||
        String(d.title ?? "")
          .toLowerCase()
          .includes(query) ||
        String(d.code ?? "")
          .toLowerCase()
          .includes(query) ||
        String(d.office?.name ?? "")
          .toLowerCase()
          .includes(query);

      const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
      const matchesType = typeFilter === "ALL" || d.doctype === typeFilter;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [latestDocuments, q, statusFilter, typeFilter]);

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
    <section className="flex flex-col gap-4 min-h-0 h-full">
      <PageHeading
        title="Documents Library"
        right={
          isQA(role) ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate("/documents/create")}
            >
              Create document
            </Button>
          ) : isDepartment(role) ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate("/documents/request")}
            >
              Request document
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, code, office..."
            disabled={loading}
            className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={loading}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:opacity-60"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            disabled={loading}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:opacity-60"
          >
            <option value="ALL">All types</option>
            <option value="internal">internal</option>
            <option value="external">external</option>
            <option value="forms">forms</option>
          </select>
        </div>

        <div className="flex-1" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setQ("");
            setStatusFilter("ALL");
            setTypeFilter("ALL");
          }}
        >
          Clear
        </Button>
      </div>

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
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full min-h-0 overflow-y-auto">
              <Table<Document>
                className="h-full"
                columns={columns}
                rows={filteredRows}
                rowKey={(d) => d.id}
                onRowClick={(d) => navigate(`/documents/${d.id}`)}
                loading={loading}
                loadingStyle="skeleton"
                error={error}
                emptyMessage='There are no documents yet. Try creating one from the "Create document" page.'
              />
            </div>
          </div>
        );
      })()}
    </section>
  );
};

export default DocumentLibraryPage;
