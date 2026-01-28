import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { clearAuth, getAuthToken } from "../auth";

export default function ProtectedLayout() {
  const token = getAuthToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("http://localhost:8000/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!alive) return;

        if (res.status === 401) {
          clearAuth();
          window.location.href = "/login";
        }
      } catch {
        // If backend is down, don't force logout; only logout on real 401.
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);


 const handleLogout = () => {
   clearAuth();
   window.location.href = "/login";
 };


  // Pages that manage their own padding/scroll containers
  const isSelfManaged =
    location.pathname === "/dashboard" ||
    location.pathname === "/work-queue" ||
    location.pathname.startsWith("/documents");


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
