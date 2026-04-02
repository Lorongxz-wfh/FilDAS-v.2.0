import React from "react";
import { Users, UserCheck, UserX, Activity } from "lucide-react";
import KpiCard from "../../ui/KpiCard";
import ReportChartCard from "../ReportChartCard";
import AdminUsersByRoleChart from "../../dashboard/AdminUsersByRoleChart";

interface UsersTabProps {
  adminUserLoading: boolean;
  adminUserStats: any;
}

const UsersTab: React.FC<UsersTabProps> = ({
  adminUserLoading,
  adminUserStats,
}) => {
  if (!adminUserStats) return null;

  return (
    <>
      {/* User KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiCard
          loading={adminUserLoading}
          label="Total users"
          value={adminUserStats.total}
          sub="Registered accounts"
          icon={<Users size={16} className="text-sky-600 dark:text-sky-400" />}
          iconBg="bg-sky-50 dark:bg-sky-900/30"
        />
        <KpiCard
          loading={adminUserLoading}
          label="Active"
          value={adminUserStats.active}
          sub="Logged in last 30 days"
          icon={<UserCheck size={16} className="text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <KpiCard
          loading={adminUserLoading}
          label="Inactive"
          value={adminUserStats.inactive}
          sub="No login for 30+ days"
          icon={<UserX size={16} className="text-slate-400" />}
          iconBg="bg-slate-100 dark:bg-surface-400"
        />
        <KpiCard
          loading={adminUserLoading}
          label="New this month"
          value={adminUserStats.new_this_month}
          sub="Accounts created recently"
          icon={<Activity size={16} className="text-violet-600 dark:text-violet-400" />}
          iconBg="bg-violet-50 dark:bg-violet-900/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ReportChartCard
          title="Users by status"
          subtitle="Distribution of system access levels"
          loading={adminUserLoading}
        >
          <AdminUsersByRoleChart 
            active={adminUserStats.active} 
            inactive={adminUserStats.inactive} 
            loading={adminUserLoading} 
          />
        </ReportChartCard>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Account lifecycle</h3>
            <div className="space-y-4">
              {[
                { label: "Verified emails", value: adminUserStats.verified, color: "text-emerald-500" },
                { label: "Pending verification", value: adminUserStats.unverified, color: "text-amber-500" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{row.label}</span>
                  <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-surface-400 bg-slate-50/50 dark:bg-surface-600/20 p-10 text-center">
            <p className="text-xs text-slate-400">Additional user growth metrics planned for v2.1</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UsersTab;
