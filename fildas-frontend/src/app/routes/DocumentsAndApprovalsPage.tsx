import React, { useEffect, useState } from "react";
import { listDocuments } from "../../services/documents";
import type { Document } from "../../services/documents";
import PendingActionsSection from "../components/PendingActionsSection";
import DocumentsListPage from "./DocumentsListPage";
import { getUserRole, isPendingForRole, isQA } from "../../lib/roleFilters";

const DocumentsAndApprovalsPage: React.FC = () => {
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole] = useState(getUserRole());

  // Filter pending actions for this user
  const pendingActions = allDocuments.filter((doc) =>
    isPendingForRole(doc.status, userRole),
  );

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listDocuments();
        setAllDocuments(data);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load documents");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDocumentSelect = (id: number) => {
    // Trigger app-level navigation (same as DocumentsListPage)
    window.dispatchEvent(new CustomEvent("docChanged", { detail: id }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-slate-600">Loading your documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. PENDING ACTIONS - ALWAYS FIRST */}
      <PendingActionsSection
        documents={pendingActions}
        onDocumentClick={handleDocumentSelect}
      />

      {/* 2. STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl">
        <div className="text-center">
          <div className="text-2xl font-bold text-sky-600">
            {pendingActions.length}
          </div>
          <div className="text-xs text-slate-600 uppercase tracking-wider">
            Pending Actions
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">
            {allDocuments.length}
          </div>
          <div className="text-xs text-slate-600 uppercase tracking-wider">
            Total Documents
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {allDocuments.filter((d) => d.status === "Distributed").length}
          </div>
          <div className="text-xs text-slate-600 uppercase tracking-wider">
            Official Versions
          </div>
        </div>
      </div>

      {/* 3. QA gets FULL LIST, others get FILTERED TABLE */}
      {isQA(userRole) ? (
        // QA: Full unfiltered DocumentsListPage
        <DocumentsListPage onSelectDocument={handleDocumentSelect} />
      ) : (
        // NON-QA: Filtered/collapsible table (same component, filtered data)
        <div className="border rounded-xl overflow-hidden bg-white">
          <DocumentsListPage
            onSelectDocument={handleDocumentSelect}
            documents={allDocuments.filter((doc) =>
              ["Distributed", ...pendingActions.map((d) => d.status)].includes(
                doc.status,
              ),
            )}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentsAndApprovalsPage;
