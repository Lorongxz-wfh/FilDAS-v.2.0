import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { clearAuthUser } from "../lib/auth";

export default function ProtectedLayout() {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    clearAuthUser();
    window.location.href = "/login";
  };

  return (
    <MainLayout onLogout={handleLogout}>
      <Outlet />
    </MainLayout>
  );
}
