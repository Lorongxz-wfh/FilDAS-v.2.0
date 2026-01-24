import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

export default function ProtectedLayout() {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.location.href = "/login";
  };

  return (
    <MainLayout onLogout={handleLogout}>
      <Outlet />
    </MainLayout>
  );
}
