import React from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/documents-approvals", label: "📋 Documents & Approvals" },
  { to: "/dashboard", label: "🏠 Dashboard" },
  { to: "/documents", label: "📄 All Documents" },
  { to: "/documents/create", label: "✨ Create document" },
  { to: "/documents/request", label: "📝 Request document" },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white text-sm text-slate-700 md:flex md:flex-col">
      <nav className="flex-1 space-y-0 px-2 py-2">
        {links.map((link) => (
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
