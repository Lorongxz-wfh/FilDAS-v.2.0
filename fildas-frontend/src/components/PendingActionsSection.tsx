import React from "react";
import type { WorkQueueItem } from "../services/documents";

interface Props {
  title?: string;
  items: WorkQueueItem[];
  onDocumentClick: (id: number) => void;
  emptyText?: string;
}

const PendingActionsSection: React.FC<Props> = ({
  title,
  items,
  onDocumentClick,
  emptyText,
}) => (
  <section className="flex flex-1 flex-col gap-3 h-full">
    {title && (
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
    )}

    {items.length === 0 ? (
      <div className="flex flex-1 h-full">
        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 text-center flex items-center justify-center">
          <div>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              ✓
            </div>
            <div className="text-sm font-semibold text-slate-900">
              All caught up
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {emptyText ?? "No pending actions right now."}
            </div>
          </div>
        </div>
      </div>
    ) : (
      items.map((it) => {
        const doc = it.document;
        const ver = it.version;

        return (
          <div
            key={`${doc.id}-${ver.id}`}
            className="group hover:shadow-md transition-shadow p-4 border rounded-lg cursor-pointer hover:bg-slate-50"
            onClick={() => onDocumentClick(doc.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate pr-2">
                  {doc.title}
                </h3>
                <p className="text-sm font-medium text-sky-600 mt-0.5">
                  {ver.status}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {doc.code} • v{ver.version_number}
                </p>
              </div>

              <div className="ml-3 shrink-0">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                  {it.can_act ? "Take Action →" : "View →"}
                </span>
              </div>
            </div>
          </div>
        );
      })
    )}
  </section>
);

export default PendingActionsSection;
