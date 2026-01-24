import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDocuments } from "../../services/documents";
import type { Document } from "../../services/documents";
import PendingActionsSection from "../components/PendingActionsSection";
import DocumentsListPage from "./DocumentsListPage";
import { getUserRole, isPendingForRole, isQA } from "../../lib/roleFilters";

import Alert from "../components/ui/Alert";
import { Card, CardBody } from "../components/ui/Card";
import PageHeading from "../components/ui/PageHeading";

const DocumentsAndApprovalsPage: React.FC = () => {
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

  if (loading) {
    return (
      <div className="text-sm text-slate-600">Loading your documents...</div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Documents & Approvals"
        subtitle="Review pending actions and access official versions."
      />

      {/* Stats row */}
      <Card>
        <CardBody className="bg-linear-to-r from-sky-50 to-indigo-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </CardBody>
      </Card>

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Actions */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardBody>
              <PendingActionsSection
                documents={pendingActions}
                onDocumentClick={handleDocumentSelect}
              />
            </CardBody>
          </Card>
        </div>

        {/* Documents List */}
        <div className="lg:col-span-8">
          {isQA(userRole) ? (
            <DocumentsListPage />
          ) : (
            <DocumentsListPage
              documents={allDocuments.filter((doc) =>
                [
                  "Distributed",
                  ...pendingActions.map((d) => d.status),
                ].includes(doc.status),
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsAndApprovalsPage;
