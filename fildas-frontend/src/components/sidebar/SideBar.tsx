import React from "react";
import { NavLink } from "react-router-dom";
import { getUserRole } from "../../lib/roleFilters";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  FolderOpen,
  Archive,
  BarChart3,
  ClipboardList,
  ScrollText,
  Users,
} from "lucide-react";

type LinkItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
};

const links: LinkItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/work-queue", label: "Work queue", icon: Inbox },
  { to: "/documents", label: "Library", icon: FolderOpen },
  { to: "/archive", label: "Archive", icon: Archive },

  // roles must match getUserRole() outputs (uppercase)
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["QA"] },
  {
    to: "/audit-logs",
    label: "Audit logs",
    icon: ScrollText,
    roles: ["QA", "SYSADMIN"],
  },
  {
    to: "/user-manager",
    label: "User manager",
    icon: Users,
    roles: ["SYSADMIN"],
  },
];

const Sidebar: React.FC = () => {
  const role = getUserRole(); // "QA" | "DEPARTMENT" | "VPAA" | "PRESIDENT" | "SYSADMIN"
  const visibleLinks = links.filter((l) => !l.roles || l.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <nav className="flex-1 space-y-1 px-2 py-3">
        {visibleLinks.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-base font-medium transition border-l-4 ${
                  isActive
                    ? "border-sky-600 bg-sky-50 text-sky-700"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-200"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
