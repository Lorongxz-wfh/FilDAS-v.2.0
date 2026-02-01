import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  return (
    <PageFrame
      title="Reports"
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
        Placeholder only. Later: office compliance, bottlenecks, turnaround
        time, and per-role summaries.
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
          Workflow bottlenecks
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-100 p-6">
          Completion rates
        </div>
      </div>
    </PageFrame>
  );
};

export default ReportsPage;
