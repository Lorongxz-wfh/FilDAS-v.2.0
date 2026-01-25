import React from "react";

const ReportsPage: React.FC = () => {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Reports [PLACEHOLDER]
      </h1>
      <p className="text-sm text-slate-600">
        QA analytics and workflow reports.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Workflow bottlenecks
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Completion rates
        </div>
      </div>
    </section>
  );
};

export default ReportsPage;
