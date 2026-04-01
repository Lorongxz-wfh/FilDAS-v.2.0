import React from "react";
import { Menu, Sun, Moon } from "lucide-react";
import SearchBar from "./SearchBar";
import NotificationBell from "./NotificationBell";
import Tooltip from "../ui/Tooltip";

interface NavbarProps {
  onThemeToggle?: () => void;
  theme?: "light" | "dark";
  onMobileMenuOpen?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onThemeToggle,
  theme = "light",
  onMobileMenuOpen,
}) => {
  return (
    <header className="relative z-50 border-b border-slate-200 bg-white dark:border-surface-400 dark:bg-surface-500">
      <div className="flex items-center gap-3 px-4 py-2.5 h-13.5">
        {/* Mobile hamburger */}
        <Tooltip content="Open menu" side="bottom">
          <button
            type="button"
            onClick={onMobileMenuOpen}
            className="cursor-pointer md:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-surface-400 transition"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </Tooltip>

        {/* Desktop spacer to push search to center */}
        <div className="hidden md:block w-190" />

        <SearchBar isMobileIconOnly={false} />

        {/* Right actions — equal width to left spacer so search stays centered */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {/* Theme toggle — HIDDEN ON MOBILE (lives in sidebar) */}
          <Tooltip content={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} side="bottom">
            <button
              type="button"
              onClick={onThemeToggle}
              className="hidden md:block cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-surface-400 transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </Tooltip>

          <NotificationBell />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
