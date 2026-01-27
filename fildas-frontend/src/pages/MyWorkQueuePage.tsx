import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDocuments } from "../services/documents";
import type { Document } from "../services/documents";
import PendingActionsSection from "../components/PendingActionsSection";
import {
  getUserRole,
  isPendingForRole,
  isQA,
  isDepartment,
} from "../lib/roleFilters";

import Alert from "../components/ui/Alert";
import { Card, CardBody } from "../components/ui/Card";
import PageHeading from "../components/ui/PageHeading";

import Button from "../components/ui/Button";
import InlineSpinner from "../components/ui/loader/InlineSpinner";
import SkeletonList from "../components/ui/loader/SkeletonList";

import { markWorkQueueSession } from "../lib/guards/RequireFromWorkQueue";

const MyWorkQueuePage: React.FC = () => {
  const navigate = useNavigate();
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
    navigate(`/documents/${id}`);
  };

  return (
    <div className="space-y-0">
      {/* Header + actions (dashboard-like) */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 backdrop-blur pl-2 pr-6 pt-0 pb-3 lg:pl-4 lg:pr-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900">
              Documents & Approvals
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/documents")}
            >
              Open document library
            </Button>

            {isQA(userRole) && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  markWorkQueueSession();
                  navigate("/documents/create", {
                    state: { fromWorkQueue: true },
                  });
                }}
              >
                Create document
              </Button>
            )}

            {isDepartment(userRole) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  markWorkQueueSession();
                  navigate("/documents/request", {
                    state: { fromWorkQueue: true },
                  });
                }}
              >
                Request document
              </Button>
            )}
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
      </div>

      {/* Body */}
      <div className="space-y-6 pl-2 pr-6 pt-4 pb-0 lg:pl-4 lg:pr-8">
        {/* Stats row */}
        <Card className="overflow-hidden">
          <CardBody className="bg-white p-0">
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-y-0 md:divide-x">
              <div className="text-center py-3">
                <div className="text-3xl font-semibold text-sky-700 tabular-nums">
                  {loading ? (
                    <InlineSpinner className="h-5 w-5 border-2" />
                  ) : (
                    pendingActions.length
                  )}
                </div>

                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Pending
                </div>
              </div>

              <div className="text-center py-3">
                <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                  {loading ? (
                    <InlineSpinner className="h-5 w-5 border-2" />
                  ) : (
                    allDocuments.length
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Total documents
                </div>
              </div>

              <div className="text-center py-3">
                <div className="text-2xl font-semibold text-emerald-700 tabular-nums">
                  {loading ? (
                    <InlineSpinner className="h-5 w-5 border-2" />
                  ) : (
                    allDocuments.filter((d) => d.status === "Distributed")
                      .length
                  )}
                </div>

                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Official
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Two-column content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pending Actions */}
          <div className="lg:col-span-12">
            <Card className="h-full">
              <CardBody className="h-95 flex flex-col min-h-0">
                {/* Keep a header row visible (dashboard-like) */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Pending actions
                    </div>
                    <div className="text-xs text-slate-600">
                      Top items requiring your action.
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/work-queue")}
                  >
                    View all
                  </Button>
                </div>

                <div className="mt-3 flex-1 min-h-0 overflow-y-auto">
                  {loading ? (
                    <div className="space-y-2">
                      <SkeletonList rows={6} rowClassName="h-10" />
                    </div>
                  ) : (
                    <PendingActionsSection
                      documents={pendingActions}
                      onDocumentClick={handleDocumentSelect}
                    />
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyWorkQueuePage;
