import React from "react";

const UserManagerPage: React.FC = () => {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        System Admin [PLACEHOLDER]
      </h1>
      <p className="text-sm text-slate-600">User and role management.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Users
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Roles
        </div>
      </div>
    </section>
  );
};

export default UserManagerPage;
