import React from "react";
import { NavLink } from "react-router-dom";
import { getUserRole } from "../../lib/roleFilters";

type LinkItem = { to: string; label: string; roles?: string[] };

const links: LinkItem[] = [
  { to: "/dashboard", label: "🏠 Dashboard" },
  { to: "/work-queue", label: "📋 Work queue" },
  { to: "/documents", label: "📚 Document library" },
  { to: "/archive", label: "🗄️ Archive" },

  // roles must match getUserRole() outputs (uppercase)
  { to: "/reports", label: "📊 Reports", roles: ["QA"] },
  { to: "/audit-logs", label: "🧾 Audit logs", roles: ["QA", "SYSADMIN"] },
  { to: "/user-manager", label: "👥 User manager", roles: ["SYSADMIN"] },
];

const Sidebar: React.FC = () => {
  const role = getUserRole(); // "QA" | "DEPARTMENT" | "VPAA" | "PRESIDENT" | "SYSADMIN"
  const visibleLinks = links.filter((l) => !l.roles || l.roles.includes(role));

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white text-sm text-slate-700 md:flex md:flex-col">
      <nav className="flex-1 space-y-0 px-2 py-2">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex w-full items-center rounded-sm px-3 py-2 text-left transition ${
                isActive
                  ? "bg-sky-50 text-sky-700"
                  : "hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
