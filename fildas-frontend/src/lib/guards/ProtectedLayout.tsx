import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { clearAuthUser } from "../auth";

export default function ProtectedLayout() {
  const token = localStorage.getItem("auth_token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    clearAuthUser();
    sessionStorage.removeItem("from_workqueue_session");
    window.location.href = "/login";
  };

  // Pages that manage their own padding/scroll containers
  const selfManagedLayoutPaths = ["/dashboard", "/work-queue", "/documents"];
  const isSelfManaged = selfManagedLayoutPaths.includes(location.pathname);

  return (
    <MainLayout
      onLogout={handleLogout}
      noMainPadding={isSelfManaged}
      noBodyScroll={true}
    >
      <Outlet />
    </MainLayout>
  );
}
