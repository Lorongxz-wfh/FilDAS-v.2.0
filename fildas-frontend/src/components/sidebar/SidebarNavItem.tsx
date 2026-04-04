import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import type { NavItem } from "./navConfig";

interface SidebarNavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose?: () => void;
  children?: NavItem[];
  userRole?: string;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  to,
  label,
  icon: Icon,
  collapsed,
  mobileOpen,
  onMobileClose,
  children,
  userRole,
}) => {
  const { pathname } = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = children && children.length > 0;
  const filteredChildren = children?.filter(child => !child.roles || child.roles.includes(userRole || "")) || [];

  const isSharedMobile = ["/dashboard", "/work-queue", "/document-requests", "/documents"].includes(to);

  // Custom active logic to handle /documents/:id (Flow) vs /documents (Library)
  const isActuallyActive = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    
    // Check if any child is active
    if (hasChildren) {
      if (filteredChildren.some(child => pathname.startsWith(child.to))) return true;
    }

    // Work Queue highlights for: /work-queue, /documents/all, or /documents/:id (Flow)
    if (to === "/work-queue") {
      if (pathname === "/work-queue" || pathname === "/documents/all") return true;
      // It's a flow page if path is /documents/:id AND not /documents/create AND not /view
      if (segments.length === 2 && segments[0] === "documents" && segments[1] !== "create") {
         return true;
      }
      return false;
    }

    // Library highlights for: /documents, /documents/create, or /documents/:id/view
    if (to === "/documents") {
      if (pathname === "/documents" || pathname === "/documents/create") return true;
      // It's a view page if path is /documents/:id/view (length 3)
      if (segments.length === 3 && segments[0] === "documents" && segments[2] === "view") return true;
      return false;
    }

    // Default prefix match for other items
    return pathname.startsWith(to);
  }, [pathname, to, hasChildren, filteredChildren]);

  useEffect(() => {
    if (isActuallyActive && hasChildren) {
      setIsExpanded(true);
    }
  }, [isActuallyActive, hasChildren]);

  const handleToggle = (e: React.MouseEvent) => {
    // Only toggle (and prevent navigation) if we are already ON the parent page
    // Otherwise, allow the NavLink to navigate to 'to'
    if (hasChildren && pathname === to) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
    
    if (mobileOpen && !hasChildren) onMobileClose?.();
  };

  const navCls = [
    "group relative flex w-full items-center cursor-pointer overflow-hidden transition-all duration-200",
    // Desktop Styles
    !mobileOpen ? [
      "rounded-md text-sm font-medium",
      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
      isActuallyActive
        ? "text-slate-900 dark:text-slate-100 shadow-xs"
        : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-surface-400/50 dark:hover:text-slate-200",
    ].join(" ") : "",
    // Mobile Styles
    mobileOpen ? [
      "rounded-xl text-[12px] font-bold duration-200 active:scale-[0.98] gap-3 px-3 py-1.5 h-9.5",
      isActuallyActive
        ? "text-brand-600 dark:text-brand-400"
        : "text-slate-500 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200 shadow-none",
    ].join(" ") : ""
  ].join(" ");

  const iconCls = [
    "shrink-0 transition-all duration-300 z-10",
    isActuallyActive ? "scale-105" : "scale-100 opacity-80",
    // Desktop Icon
    !mobileOpen ? [
      isActuallyActive ? "text-brand-500 dark:text-brand-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
    ].join(" ") : "",
    // Mobile Icon
    mobileOpen ? [
      "h-4 w-4",
      isActuallyActive ? "text-brand-500" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
    ].join(" ") : ""
  ].join(" ");

  return (
    <li className={isSharedMobile ? "md:block hidden" : ""}>
      <NavLink
        to={to}
        onClick={handleToggle}
        className={navCls}
      >
        {isActuallyActive && !mobileOpen && (
          <>
            <motion.div
              layoutId="active-bg"
              className="absolute inset-0 bg-slate-100/80 dark:bg-surface-400/80 rounded-md"
              transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
            />
            <motion.div
              layoutId="active-pill"
              className="absolute left-0 top-2 bottom-2 w-1 bg-brand-500 rounded-r-full"
              transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
            />
          </>
        )}
        {isActuallyActive && mobileOpen && (
          <motion.div
            layoutId="active-bg-mobile"
            className="absolute inset-0 bg-brand-500/10 rounded-xl"
            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
          />
        )}
        
        <div className={!mobileOpen ? "flex items-center justify-center w-5" : ""}>
          <Icon className={iconCls} size={mobileOpen ? 16 : 18} />
        </div>
        
        {(!collapsed || mobileOpen) && (
          <span className={[
            "z-10 transition-transform duration-300",
            isActuallyActive ? "translate-x-0.5" : "translate-x-0",
            mobileOpen ? "truncate tracking-tight select-none flex-1" : "truncate flex-1"
          ].join(" ")}>
            {label}
          </span>
        )}

        {hasChildren && (!collapsed || mobileOpen) && (
          <ChevronDown 
            size={14}
            className={[
              "transition-transform duration-300 z-10",
              isExpanded ? "rotate-0" : "-rotate-90",
              isActuallyActive ? "text-sky-500" : "text-slate-400"
            ].join(" ")} 
          />
        )}
      </NavLink>

      {/* Animated Nesting Container */}
      {hasChildren && (!collapsed || mobileOpen) && (
        <div 
          className={[
            "grid transition-all duration-300 ease-in-out",
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <ul className={[
              "mt-1 mb-2 flex flex-col gap-0.5",
              !mobileOpen ? "ml-4 pl-4 border-l border-slate-100 dark:border-surface-400/50" : "ml-4"
            ].join(" ")}>
              {filteredChildren.map((child) => (
                <li key={child.to}>
                  <NavLink
                    to={child.to}
                    onClick={() => {
                      if (mobileOpen) onMobileClose?.();
                    }}
                    className={({ isActive }) => [
                      "group relative flex items-center gap-3 px-3 py-1.5 rounded-md transition-all cursor-pointer",
                      "text-[13px] font-medium leading-tight",
                      isActive
                        ? "text-slate-900 dark:text-slate-100"
                        : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-surface-400/30 dark:hover:text-slate-200",
                    ].join(" ")}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            layoutId="sub-active-bg"
                            className="absolute inset-0 bg-slate-50 dark:bg-surface-400/40 rounded-md"
                            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                          />
                        )}
                        <child.icon size={14} className={[
                          "shrink-0 transition-colors z-10",
                          isActive ? "text-brand-500" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600"
                        ].join(" ")} />
                        <span className="truncate z-10">{child.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>

  );
};

export default SidebarNavItem;
