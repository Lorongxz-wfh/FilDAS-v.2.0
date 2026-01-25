import React from "react";

const OfficeDashboardPage: React.FC = () => {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Office Dashboard [PLACEHOLDER]
      </h1>
      <p className="text-sm text-slate-600">
        Office-specific stats: My docs by status, recent activity.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Draft</h3>
          <div className="text-2xl font-bold text-slate-900">3</div>
        </div>
        {/* More stats cards */}
      </div>
    </section>
  );
};

export default OfficeDashboardPage;
