import React, { useState, useEffect } from "react";
import MainLayout from "./app/layout/MainLayout";
import DashboardPage from "./app/routes/DashboardPage";
import DocumentsListPage from "./app/routes/DocumentsListPage";
import DocumentsCreatePage from "./app/routes/DocumentsCreatePage";
import DocumentRequestPage from "./app/routes/DocumentRequestPage";
import DocumentFlowPage from "./app/routes/DocumentFlowPage";
import LoginPage from "./app/routes/LoginPage";

function App() {
  const [currentRoute, setCurrentRoute] = useState<string>("dashboard");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // check token on first load
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    setIsAuthenticated(!!token);
  }, []);

  const handleLoggedIn = () => {
    setIsAuthenticated(true);
    setCurrentRoute("dashboard"); // default after login
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setIsAuthenticated(false);
    setCurrentRoute("dashboard");
  };

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    if (route !== "document-flow") {
      setSelectedDocumentId(null);
    }
  };

  if (!isAuthenticated) {
    // not logged in: show only login page
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  let content: React.ReactNode = null;

  switch (currentRoute) {
    case "dashboard":
      content = <DashboardPage />;
      break;
    case "documents-list":
      content = (
        <DocumentsListPage
          onSelectDocument={(id) => {
            setSelectedDocumentId(id);
            setCurrentRoute("document-flow");
          }}
        />
      );
      break;
    case "documents-create":
      content = <DocumentsCreatePage />;
      break;
    case "documents-request":
      content = <DocumentRequestPage />;
      break;
    case "document-flow":
      if (selectedDocumentId != null) {
        content = <DocumentFlowPage id={selectedDocumentId} />;
      } else {
        content = (
          <div className="text-sm text-slate-600">No document selected.</div>
        );
      }
      break;
    default:
      content = (
        <div className="text-sm text-slate-600">
          This page is not implemented yet.
        </div>
      );
  }

  return (
    <MainLayout
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {content}
    </MainLayout>
  );
}

export default App;
