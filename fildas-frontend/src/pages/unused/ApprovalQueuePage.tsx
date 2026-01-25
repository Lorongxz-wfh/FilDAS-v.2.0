import React from "react";

const ApprovalQueuePage: React.FC = () => {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Approval Queue [PLACEHOLDER]
      </h1>
      <p className="text-sm text-slate-600">
        Pending approvals for your role (VPAA/President/Head).
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        Table of docs waiting for your action.
      </div>
    </section>
  );
};

export default ApprovalQueuePage;
