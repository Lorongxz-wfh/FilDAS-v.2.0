import React from "react";
import type { Document } from "../../services/documents";

interface Props {
  documents: Document[];
  onDocumentClick: (id: number) => void;
}

const PendingActionsSection: React.FC<Props> = ({
  documents,
  onDocumentClick,
}) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-900">
        📋 My Pending Actions ({documents.length})
      </h2>
      {documents.length === 0 && (
        <span className="text-sm text-slate-500">No actions needed</span>
      )}
    </div>

    {documents.length === 0 ? (
      <div className="text-center py-8 text-sm text-slate-500 rounded-lg border-2 border-dashed border-slate-200">
        All caught up! 🎉
      </div>
    ) : (
      documents.map((doc) => (
        <div
          key={doc.id}
          className="group hover:shadow-md transition-shadow p-4 border rounded-lg cursor-pointer hover:bg-slate-50"
          onClick={() => onDocumentClick(doc.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate pr-2">
                {doc.title}
              </h3>
              <p className="text-sm font-medium text-sky-600 mt-0.5">
                {doc.status}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {doc.code} • v{doc.version_number}
              </p>
            </div>
            <div className="ml-3 shrink-0">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                Take Action →
              </span>
            </div>
          </div>
        </div>
      ))
    )}
  </section>
);

export default PendingActionsSection;
