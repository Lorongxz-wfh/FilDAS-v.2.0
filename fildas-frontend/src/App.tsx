import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MyWorkQueuePage from "./pages/MyWorkQueuePage";
import DocumentLibraryPage from "./pages/DocumentLibraryPage";
import CreateDocumentPage from "./pages/CreateDocumentPage";
import RequestDocumentPage from "./pages/RequestDocumentPage";

import DocumentFlowPage from "./pages/DocumentFlowPage";

import ProtectedLayout from "./pages/ProtectedLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/work-queue" element={<MyWorkQueuePage />} />
        <Route path="/documents" element={<DocumentLibraryPage />} />
        <Route path="/documents/create" element={<CreateDocumentPage />} />
        <Route path="/documents/request" element={<RequestDocumentPage />} />
        <Route path="/documents/:id" element={<DocumentFlowPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
