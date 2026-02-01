import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";

const ArchivePage: React.FC = () => {
  const navigate = useNavigate();

  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  return (
    <PageFrame
      title="Archive"
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
      <Alert variant="warning">
        Placeholder. Later: show inactive/archived documents (read-only), with
        optional restore for QA/SYS_ADMIN.
      </Alert>

      <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
        Archived documents table.
      </div>
    </PageFrame>
  );
};

export default ArchivePage;
