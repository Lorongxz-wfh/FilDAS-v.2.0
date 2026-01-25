import React from "react";

const DashboardPage: React.FC = () => {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Dashboard
      </h1>
      <p className="text-sm text-slate-600">
        This dashboard will show counts of documents per status and quick links
        for QA and departments.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-700">
        Dashboard placeholder content.
      </div>
    </section>
  );
};

export default DashboardPage;
