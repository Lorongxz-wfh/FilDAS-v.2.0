import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MyWorkQueuePage from "./pages/MyWorkQueuePage";
import DocumentLibraryPage from "./pages/DocumentLibraryPage";
import CreateDocumentPage from "./pages/CreateDocumentPage";
import RequestDocumentPage from "./pages/RequestDocumentPage";
import NotificationsPage from "./pages/NotificationsPage";
import ArchivePage from "./pages/ArchivePage";
import ReportsPage from "./pages/ReportsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import UserManagerPage from "./pages/UserManagerPage";

import DocumentFlowPage from "./pages/DocumentFlowPage";

import ProtectedLayout from "./lib/guards/ProtectedLayout";
import RequireFromWorkQueue from "./lib/guards/RequireFromWorkQueue";
import RequireRole from "./lib/guards/RequireRole";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/work-queue" element={<MyWorkQueuePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* DocumentFlow is ok to open normally */}
        <Route path="/documents/:id" element={<DocumentFlowPage />} />

        {/* Document library should be reachable from sidebar */}
        <Route path="/documents" element={<DocumentLibraryPage />} />

        {/* These 2 pages can stay WorkQueue-only if you want */}
        <Route element={<RequireFromWorkQueue />}>
          {/* QA only */}
          <Route element={<RequireRole allow={["QA"]} />}>
            <Route path="/documents/create" element={<CreateDocumentPage />} />
          </Route>

          {/* Department only */}
          <Route element={<RequireRole allow={["DEPARTMENT"]} />}>
            <Route
              path="/documents/request"
              element={<RequestDocumentPage />}
            />
          </Route>
        </Route>

        {/* Role-limited pages */}
        <Route element={<RequireRole allow={["QA"]} />}>
          <Route path="/reports" element={<ReportsPage />} />
        </Route>

        <Route element={<RequireRole allow={["QA", "SYSADMIN"]} />}>
          <Route path="/audit-logs" element={<AuditLogsPage />} />
        </Route>

        <Route element={<RequireRole allow={["SYSADMIN"]} />}>
          <Route path="/user-manager" element={<UserManagerPage />} />
        </Route>

        {/* Archive is authenticated */}
        <Route path="/archive" element={<ArchivePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
