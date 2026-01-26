import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "../../hooks/useAuthUser"; // adjust path

interface NavbarProps {
  title?: string;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ title = "FilDAS", onLogout }) => {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const fullName: string = user?.full_name || "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sky-500 text-sm font-semibold text-white">
            {initials || "U"}
          </span>

          <span className="text-sm font-semibold tracking-tight text-slate-900">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsNotifOpen((v) => !v)}
            className="relative rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            aria-haspopup="menu"
            aria-expanded={isNotifOpen}
          >
            🔔
          </button>

          {isNotifOpen && (
            <div className="absolute right-6 top-14 w-72 rounded-md border border-slate-200 bg-white shadow-lg">
              <div className="px-3 py-2 text-xs font-semibold text-slate-700">
                Notifications
              </div>

              <div className="max-h-56 overflow-auto px-3 py-2 text-xs text-slate-600">
                No notifications yet.
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-3 py-2">
                <button
                  type="button"
                  className="text-xs font-medium text-sky-700 hover:text-sky-900"
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate("/notifications");
                  }}
                >
                  View all
                </button>
              </div>
            </div>
          )}

          <span className="text-xs text-slate-600">
            {user?.full_name ?? ""}
          </span>

          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
