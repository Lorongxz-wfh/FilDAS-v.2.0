import React, { Suspense } from "react";

import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";

const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const MyWorkQueuePage = React.lazy(() => import("./pages/MyWorkQueuePage"));
const DocumentLibraryPage = React.lazy(
  () => import("./pages/DocumentLibraryPage"),
);
const CreateDocumentPage = React.lazy(
  () => import("./pages/CreateDocumentPage"),
);
const InboxPage = React.lazy(() => import("./pages/InboxPage"));
const ArchivePage = React.lazy(() => import("./pages/ArchivePage"));
const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));
const MyActivityPage = React.lazy(() => import("./pages/MyActivityPage"));
const UserManagerPage = React.lazy(() => import("./pages/UserManagerPage"));
const ActivityLogsPage = React.lazy(() => import("./pages/ActivityLogsPage"));
const DocumentFlowPage = React.lazy(() => import("./pages/DocumentFlowPage"));

import ProtectedLayout from "./lib/guards/ProtectedLayout";
import RequireRole from "./lib/guards/RequireRole";

export default function App() {
  return (
    <Suspense
      fallback={<div className="p-4 text-sm text-slate-600">Loading…</div>}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/work-queue" element={<MyWorkQueuePage />} />
          <Route path="/my-activity" element={<MyActivityPage />} />
          <Route path="/inbox" element={<InboxPage />} />

          {/* DocumentFlow is ok to open normally */}
          <Route path="/documents/:id" element={<DocumentFlowPage />} />

          {/* Document library should be reachable from sidebar */}
          <Route path="/documents" element={<DocumentLibraryPage />} />

          {/* Create can be opened from anywhere, but still role-protected */}
          <Route
            element={
              <RequireRole allow={["QA", "OFFICE_STAFF", "OFFICE_HEAD"]} />
            }
          >
            <Route path="/documents/create" element={<CreateDocumentPage />} />
          </Route>

          {/* Remove RequestDocumentPage for now (old flow). */}
          <Route
            path="/documents/request"
            element={<Navigate to="/documents/create" replace />}
          />

          {/* Role-limited pages */}
          <Route
            element={
              <RequireRole
                allow={["PRESIDENT", "VPAA", "QA", "SYSADMIN", "ADMIN"]}
              />
            }
          >
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          <Route element={<RequireRole allow={["QA", "SYSADMIN", "ADMIN"]} />}>
            <Route path="/activity-logs" element={<ActivityLogsPage />} />
          </Route>

          <Route element={<RequireRole allow={["SYSADMIN", "ADMIN"]} />}>
            <Route path="/user-manager" element={<UserManagerPage />} />
          </Route>

          {/* Archive is authenticated */}
          <Route path="/archive" element={<ArchivePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
