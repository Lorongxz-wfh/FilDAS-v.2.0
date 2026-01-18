import React from "react";

const DocumentRequestPage: React.FC = () => {
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Request a document
      </h1>
      <p className="text-sm text-slate-600">
        This page will let departments request new documents or revisions, which
        QA will then draft and route for approval.
      </p>
    </section>
  );
};

export default DocumentRequestPage;
