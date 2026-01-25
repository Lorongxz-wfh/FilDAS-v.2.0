import React from "react";
import { useAuthUser } from "../../hooks/useAuthUser"; // adjust path


interface NavbarProps {
  title?: string;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ title = "FilDAS", onLogout }) => {
  const user = useAuthUser();
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
