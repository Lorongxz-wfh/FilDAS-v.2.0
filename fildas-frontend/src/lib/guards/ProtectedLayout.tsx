import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { clearAuth, getAuthToken } from "../auth";

export default function ProtectedLayout() {
  const token = getAuthToken();
  const checkedTokenRef = React.useRef<string | null>(null);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!token) return;

        // Avoid duplicate checks (React StrictMode/dev remounts)
        if (checkedTokenRef.current === token) return;
        checkedTokenRef.current = token;

        // Use your axios client so interceptors handle 401 consistently
        const { default: api } = await import("../../services/api");
        await api.get("/user", { params: { t: Date.now() } });

        if (!alive) return;
      } catch (e: any) {
        // Only logout on real 401 (api interceptor may already redirect)
        if (!alive) return;
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

  return (
    <MainLayout onLogout={handleLogout} noBodyScroll={true}>
      <Outlet />
    </MainLayout>
  );
}
