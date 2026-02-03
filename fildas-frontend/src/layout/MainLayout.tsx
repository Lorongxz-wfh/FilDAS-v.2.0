import React from "react";
import Navbar from "../components/navbar/NavBar";
import Sidebar from "../components/sidebar/SideBar";
import { ToastProvider } from "../components/ui/toast/ToastContext";


interface MainLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
  noBodyScroll?: boolean;
  noMainPadding?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onLogout,
  noBodyScroll = false,
  noMainPadding = false,
}) => {
  return (
    <ToastProvider>
      <div
        className={[
          "h-screen bg-slate-50 flex flex-col font-sans",
          noBodyScroll ? "overflow-hidden" : "min-h-screen",
        ].join(" ")}
      >
        <Navbar onLogout={onLogout} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />

          <main
            className={[
              "flex-1 min-w-0 min-h-0 bg-slate-50 flex flex-col overflow-hidden",
              noMainPadding ? "pt-0" : "pt-0",
            ].join(" ")}
          >
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default MainLayout;
