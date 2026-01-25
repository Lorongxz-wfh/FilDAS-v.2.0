import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentsAndApprovalsPage from "./pages/DocumentsAndApprovalsPage";
import DocumentsListPage from "./pages/DocumentsListPage";
import DocumentsCreatePage from "./pages/DocumentsCreatePage";
import DocumentRequestPage from "./pages/unused/DocumentRequestsPage";
import DocumentFlowPage from "./pages/DocumentFlowPage";

import ProtectedLayout from "./pages/ProtectedLayout";

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
