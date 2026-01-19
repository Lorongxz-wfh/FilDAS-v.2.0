import React from "react";
import Navbar from "../../components/navbar/NavBar";
import Sidebar from "../../components/sidebar/SideBar";

interface MainLayoutProps {
  children: React.ReactNode;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentRoute,
  onNavigate,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onLogout={onLogout} />
      <div className="flex flex-1 min-h-0">
        <Sidebar current={currentRoute} onNavigate={onNavigate} />
        <main className="flex-1 min-w-0 bg-slate-50 px-6 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
