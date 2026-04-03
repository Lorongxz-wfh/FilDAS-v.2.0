import Skeleton from "../ui/loader/Skeleton";
import RoleBadge from "../ui/RoleBadge";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  office_name: string | null;
  is_active: boolean;
  created_at: string;
};



const AdminRecentUsers: React.FC<{ users: User[]; loading: boolean }> = ({
  users,
  loading,
}) => (
  <div className="min-h-52.5 space-y-0.5">
    {loading
      ? Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))
      : users.slice(0, 5).map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50 dark:hover:bg-surface-600 transition-colors"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-surface-400 text-xs font-bold text-slate-600 dark:text-slate-300">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                {u.name}
              </p>
              <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                {u.office_name ?? "No office"}
              </p>
            </div>
            <RoleBadge 
              role={u.role} 
              className="shrink-0"
              dot
            />
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${u.is_active ? "bg-emerald-400" : "bg-slate-300"}`}
            />
          </div>
        ))}
  </div>
);

export default AdminRecentUsers;
