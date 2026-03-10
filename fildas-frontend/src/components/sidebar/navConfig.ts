import {
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  Inbox,
  FileText,
  BarChart3,
  ScrollText,
  Users,
  Building2,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const settingsNavItem: NavItem = {
  to: "/settings",
  label: "Settings",
  icon: Settings,
};

export const navGroups: NavGroup[] = [
  {
    label: "General",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/work-queue", label: "Work Queue", icon: ClipboardList },
      { to: "/documents", label: "Library", icon: FolderOpen },
      {
        to: "/document-requests",
        label: "Requests",
        icon: Inbox,
        roles: [
          "OFFICE_STAFF",
          "OFFICE_HEAD",
          "VPAA",
          "VPAD",
          "VPF",
          "VPR",
          "PRESIDENT",
          "ADMIN",
          "QA",
          "SYSADMIN",
        ],
      },
      { to: "/templates", label: "Templates", icon: FileText },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        to: "/reports",
        label: "Reports",
        icon: BarChart3,
        roles: [
          "QA",
          "SYSADMIN",
          "ADMIN",
          "PRESIDENT",
          "VPAA",
          "VPAD",
          "VPF",
          "VPR",
        ],
      },
      {
        to: "/activity-logs",
        label: "Activity Logs",
        icon: ScrollText,
        roles: ["QA", "SYSADMIN", "ADMIN"],
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        to: "/user-manager",
        label: "User Manager",
        icon: Users,
        roles: ["SYSADMIN", "ADMIN"],
      },
      {
        to: "/office-manager",
        label: "Office Manager",
        icon: Building2,
        roles: ["SYSADMIN", "ADMIN"],
      },
    ],
  },
];
