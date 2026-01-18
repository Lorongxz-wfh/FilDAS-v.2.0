import React from "react";

interface SidebarProps {
  current?: string;
  onNavigate?: (route: string) => void;
}

const links = [
  { id: "dashboard", label: "Dashboard" },
  { id: "documents-list", label: "Documents" },
  { id: "documents-create", label: "Create document" },
  { id: "documents-request", label: "Request document" },
];

const Sidebar: React.FC<SidebarProps> = ({ current, onNavigate }) => {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white text-sm text-slate-700 md:flex md:flex-col">
      <nav className="flex-1 space-y-0 px-2 py-2">
        {links.map((link) => {
          const active = current === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavigate?.(link.id)}
              className={`flex w-full items-center rounded-sm px-3 py-2 text-left transition ${
                active
                  ? "bg-sky-50 text-sky-700"
                  : "hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
