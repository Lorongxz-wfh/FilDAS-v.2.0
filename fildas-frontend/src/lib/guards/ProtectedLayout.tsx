import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { clearAuth, getAuthToken } from "../auth";
import { useIdleTimeout } from "../../hooks/useIdleTimeout";

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

  const { showWarning, stayLoggedIn } = useIdleTimeout(
    30 * 60 * 1000, // 30 min
    5 * 60 * 1000,  // warn at 25 min
  );

  return (
    <>
      <MainLayout onLogout={handleLogout} noBodyScroll={true}>
        <Outlet />
      </MainLayout>

      {/* Idle warning dialog */}
      {showWarning && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-surface-400 dark:bg-surface-500">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Session expiring soon
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              You'll be logged out in 5 minutes due to inactivity. Do you want
              to stay logged in?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { clearAuth(); window.location.href = "/login"; }}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-surface-300 dark:text-slate-300 dark:hover:bg-surface-400 transition"
              >
                Log out now
              </button>
              <button
                type="button"
                onClick={stayLoggedIn}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 transition"
              >
                Stay logged in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
