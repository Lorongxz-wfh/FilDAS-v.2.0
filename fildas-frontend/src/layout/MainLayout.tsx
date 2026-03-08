import React from "react";
import Navbar from "../components/navbar/NavBar";
import Sidebar from "../components/sidebar/SideBar";
import { ToastProvider } from "../components/ui/toast/ToastContext";
import { useThemeContext } from "../lib/ThemeContext";

interface MainLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
  noBodyScroll?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onLogout,
  noBodyScroll = false,
}) => {
  const { theme, toggle } = useThemeContext();

  return (
    <ToastProvider>
      <div
        className={[
          "flex font-sans bg-slate-50 dark:bg-surface-600",
          noBodyScroll ? "h-screen overflow-hidden" : "min-h-screen",
        ].join(" ")}
      >
        {/* Sidebar — full height, owns entire left side */}
        <Sidebar onLogout={onLogout} />

        {/* Right side: slim topbar + page content */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <Navbar onThemeToggle={toggle} theme={theme} />
          <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-surface-600">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default MainLayout;
