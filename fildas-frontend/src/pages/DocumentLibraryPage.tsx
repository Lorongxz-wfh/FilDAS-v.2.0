import React, { useEffect, useMemo, useState } from "react";
import {
  listDocumentsPage,
  getCurrentUserOfficeId,
  type Document,
} from "../services/documents";
import { useNavigate } from "react-router-dom";
import Table, { type TableColumn } from "../components/ui/Table";
import Button from "../components/ui/Button";
import PageFrame from "../components/layout/PageFrame";
import {
  getUserRole,
  isOfficeStaff,
  isOfficeHead,
  isQA,
  isSysAdmin,
} from "../lib/roleFilters";
import ShareDocumentModal from "../components/documents/ShareDocumentModal";

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

  const [qDebounced, setQDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

useEffect(() => {
  setPage(1);
}, [qDebounced, statusFilter, typeFilter]);

  const [hasMore, setHasMore] = useState(false);
  const PER_PAGE = 25;

  const [shareOpen, setShareOpen] = useState(false);
  const [shareDocId, setShareDocId] = useState<number | null>(null);

  // Use prop OR loaded data (single source of truth)
  const displayDocumentsRaw = documents ?? loadedDocuments;

  const role = getUserRole();
  const myOfficeId = getCurrentUserOfficeId();

  const displayDocuments = displayDocumentsRaw;

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
    // Server-side search/filters handle q/status/type.
    // Keep only the "latestDocuments" reduction client-side.
    return latestDocuments;
  }, [latestDocuments]);

  useEffect(() => {
    // If a filtered prop is provided, we do NOT paginate here.
    if (documents) {
      setLoadedDocuments([]); // keep loaded state clean
      setLoading(false);
      setError(null);
      setPage(1);
      setHasMore(false);
      return;
    }

    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const ownerOfficeParam =
          isOfficeStaff(role) || isOfficeHead(role)
            ? Number(myOfficeId)
            : undefined;

        const res = await listDocumentsPage({
          page,
          perPage: PER_PAGE,
          q: qDebounced.trim() || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          doctype: typeFilter !== "ALL" ? typeFilter : undefined,
          owner_office_id: ownerOfficeParam,
        });

        if (!alive) return;

        setLoadedDocuments((prev) => {
          const next = page === 1 ? res.data : [...prev, ...res.data];

          // de-dupe by id (safety if backend order shifts)
          const byId = new Map<number, Document>();
          for (const d of next) byId.set(d.id, d);
          return Array.from(byId.values());
        });

        // Laravel paginator typically provides links.next when more pages exist [web:712]
        setHasMore(Boolean(res.links?.next));
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? "Failed to load documents");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [documents, page, qDebounced, statusFilter, typeFilter, role, myOfficeId]);

  return (
    <PageFrame
      title="Document Library"
      right={
        isQA(role) ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() =>
              navigate("/documents/create", { state: { fromLibrary: true } })
            }
          >
            Create document
          </Button>
        ) : isOfficeStaff(role) || isOfficeHead(role) ? (
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
      contentClassName="min-h-0 flex flex-col gap-4"
    >
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, code, office..."
            // keep input usable while fetching
            disabled={false}
            className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={false}
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
            disabled={false}
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
            setPage(1);
          }}
        >
          Clear
        </Button>
      </div>

      {/* Table area (Table owns the scrolling) */}
      {(() => {
        const columns: TableColumn<Document>[] = [
          {
            key: "title",
            header: "Title",
            render: (d) => (
              <div className="min-w-0">
                <div className="truncate">{d.title}</div>

                {Array.isArray(d.tags) && d.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700"
                        title={t}
                      >
                        {t}
                      </span>
                    ))}
                    {d.tags.length > 4 && (
                      <span className="text-[10px] text-slate-500">
                        +{d.tags.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ),
          },
          { key: "code", header: "Code", render: (d) => d.code || "—" },
          { key: "type", header: "Type", render: (d) => d.doctype },
          { key: "status", header: "Status", render: (d) => d.status },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (d) => {
              const canShare =
                (isQA(role) || isSysAdmin(role)) && d.status === "Distributed";
              if (!canShare) return null;

              return (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareDocId(d.id);
                    setShareOpen(true);
                  }}
                >
                  Share
                </Button>
              );
            },
          },
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
            {!documents && !error && (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || !hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {hasMore ? "Load more" : "No more results"}
                </Button>
              </div>
            )}
          </div>
        );
      })()}
      <ShareDocumentModal
        open={shareOpen}
        documentId={shareDocId}
        onClose={() => {
          setShareOpen(false);
          setShareDocId(null);
        }}
        onSaved={() => {
          // optional: could refresh documents list later
        }}
      />
    </PageFrame>
  );
};

export default DocumentLibraryPage;
