import React from "react";
import Alert from "../components/ui/Alert";

const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
      <Alert variant="warning">No notifications yet.</Alert>
    </div>
  );
};

export default NotificationsPage;
