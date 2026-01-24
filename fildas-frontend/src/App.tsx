import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./app/routes/LoginPage";
import DashboardPage from "./app/routes/DashboardPage";
import DocumentsAndApprovalsPage from "./app/routes/DocumentsAndApprovalsPage";
import DocumentsListPage from "./app/routes/DocumentsListPage";
import DocumentsCreatePage from "./app/routes/DocumentsCreatePage";
import DocumentRequestPage from "./app/routes/DocumentRequestsPage";
import DocumentFlowPage from "./app/routes/DocumentFlowPage";

import ProtectedLayout from "./app/routes/ProtectedLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/documents-approvals"
          element={<DocumentsAndApprovalsPage />}
        />
        <Route path="/documents" element={<DocumentsListPage />} />
        <Route path="/documents/create" element={<DocumentsCreatePage />} />
        <Route path="/documents/request" element={<DocumentRequestPage />} />
        <Route path="/documents/:id" element={<DocumentFlowPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
