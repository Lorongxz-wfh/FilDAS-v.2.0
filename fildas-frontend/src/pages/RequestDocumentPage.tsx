import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";

const RequestDocumentPage: React.FC = () => {
  const navigate = useNavigate();

  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  // QA handles requests
  const role = String(me.role ?? "").toUpperCase();
  if (role !== "QA") return <Navigate to="/work-queue" replace />;

  return (
    <PageFrame
      title="Document Requests"
      right={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
        >
          ← Back
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-0">
        {/* Left: list/table */}
        <div className="lg:col-span-8 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100">
            <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/80">
              <div className="text-sm font-semibold tracking-tight text-slate-900">
                Incoming requests
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Departments submit requests; QA reviews, may return for edits,
                or drafts a document.
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-600 text-center">
                Requests table + actions (next step: wire API + pagination).
              </div>
            </div>
          </div>
        </div>

        {/* Right: details panel (placeholder) */}
        <aside className="lg:col-span-4 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/80">
              <div className="text-sm font-semibold tracking-tight text-slate-900">
                Request details
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Select a request to view details and take action.
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-600 text-center">
                No request selected.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PageFrame>
  );
};

export default RequestDocumentPage;
