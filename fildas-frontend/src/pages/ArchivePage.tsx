import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser } from "../lib/auth";
import PageFrame from "../components/layout/PageFrame";
import { Archive } from "lucide-react";

const ArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const me = getAuthUser();
  if (!me) return <Navigate to="/login" replace />;

  return (
    <PageFrame
      title="Archive"
      onBack={() => navigate(-1)}
      contentClassName="flex flex-col items-center justify-center h-full"
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-surface-400 text-slate-400 dark:text-slate-500">
          <Archive className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Archive
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Cancelled and superseded documents will appear here. This feature is coming soon.
          </p>
        </div>
      </div>
    </PageFrame>
  );
};

export default ArchivePage;
