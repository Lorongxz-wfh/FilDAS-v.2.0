import React from "react";
import { ChevronDown } from "lucide-react";
import type {
  Document,
  DocumentVersion,
  Office,
  DocumentRouteStep,
  WorkflowTask,
  OfficeUser,
} from "../../../services/documents";
import { getOfficeUsers } from "../../../services/documents";

type Props = {
  document: Document;
  version: DocumentVersion;
  offices: Office[];
  routeSteps?: DocumentRouteStep[];
  tasks?: WorkflowTask[];
};

type ParticipantRow = {
  role: string;
  label: string;
  sublabel?: string;
  status: WorkflowTask["status"] | "owner" | "pending";
  officeId: number | null;
};

const statusDot: Record<string, string> = {
  owner: "bg-sky-400",
  open: "bg-amber-400 animate-pulse",
  completed: "bg-emerald-500",
  returned: "bg-rose-400",
  rejected: "bg-rose-600",
  cancelled: "bg-slate-400",
  pending: "bg-slate-300 dark:bg-surface-300",
};

const DocumentInfoParticipantsTab: React.FC<Props> = ({
  document,
  offices,
  routeSteps = [],
  tasks = [],
}) => {
  const [officeUsers, setOfficeUsers] = React.useState<
    Record<number, OfficeUser[]>
  >({});
  const [loadingOffices, setLoadingOffices] = React.useState<Set<number>>(
    new Set(),
  );
  const [expandedOffices, setExpandedOffices] = React.useState<Set<number>>(
    new Set(),
  );
  const fetchedOfficeIds = React.useRef<Set<number>>(new Set());

  const fetchOfficeUsers = React.useCallback(async (officeId: number) => {
    if (fetchedOfficeIds.current.has(officeId)) return;
    fetchedOfficeIds.current.add(officeId);
    setLoadingOffices((prev) => new Set(prev).add(officeId));
    try {
      const users = await getOfficeUsers(officeId);
      setOfficeUsers((prev) => ({ ...prev, [officeId]: users }));
    } catch {
      setOfficeUsers((prev) => ({ ...prev, [officeId]: [] }));
    } finally {
      setLoadingOffices((prev) => {
        const next = new Set(prev);
        next.delete(officeId);
        return next;
      });
    }
  }, []);

  const toggleOffice = (officeId: number) => {
    setExpandedOffices((prev) => {
      const next = new Set(prev);
      if (next.has(officeId)) next.delete(officeId);
      else next.add(officeId);
      return next;
    });
    fetchOfficeUsers(officeId);
  };

  // Build participants list
  const ownerOffice = document.ownerOffice ?? (document as any).office ?? null;
  const participantRows: ParticipantRow[] = [];
  const seenOfficeIds = new Set<number>();

  const taskByOffice = new Map<number, WorkflowTask>();
  tasks.forEach((t) => {
    if (t.assigned_office_id != null && !taskByOffice.has(t.assigned_office_id)) {
      taskByOffice.set(t.assigned_office_id, t);
    }
  });

  if (ownerOffice) {
    seenOfficeIds.add(ownerOffice.id);
    participantRows.push({
      role: "Creator",
      label: ownerOffice.name,
      sublabel: ownerOffice.code,
      status: "owner",
      officeId: ownerOffice.id,
    });
  }

  if (routeSteps.length > 0) {
    const sorted = [...routeSteps].sort((a, b) => a.step_order - b.step_order);
    sorted.forEach((step) => {
      const offId = step.office_id;
      if (!offId || seenOfficeIds.has(offId)) return;
      seenOfficeIds.add(offId);
      const off = offices.find((o) => o.id === offId);
      const roleLabel =
        step.phase === "review" ? "Review" :
        step.phase === "approval" ? "Approval" :
        step.phase === "registration" ? "Registration" :
        step.phase;
      const task = taskByOffice.get(offId);
      participantRows.push({
        role: roleLabel,
        label: off ? off.name : `Office #${offId}`,
        sublabel: off?.code,
        status: task ? task.status : "pending",
        officeId: offId,
      });
    });
  } else {
    tasks.forEach((task) => {
      const offId = task.assigned_office_id ?? null;
      if (offId && !seenOfficeIds.has(offId)) {
        seenOfficeIds.add(offId);
        const off = offices.find((o) => o.id === offId);
        const roleLabel =
          task.phase === "review" ? "Review" :
          task.phase === "approval" ? "Approval" :
          task.phase === "registration" ? "Registration" :
          (task.step ?? task.phase);
        participantRows.push({
          role: roleLabel,
          label: off ? off.name : `Office #${offId}`,
          sublabel: off?.code,
          status: task.status,
          officeId: offId,
        });
      }
    });
  }

  // Pre-fetch all offices on mount
  React.useEffect(() => {
    const officeIds = participantRows
      .map((p) => p.officeId)
      .filter((id): id is number => id != null);
    officeIds.forEach(fetchOfficeUsers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-1.5">
      {participantRows.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
          No participants yet.
        </p>
      ) : (
        participantRows.map((p, i) => {
          const offId = p.officeId;
          const isExpanded = offId != null && expandedOffices.has(offId);
          const isLoading = offId != null && loadingOffices.has(offId);
          const users: OfficeUser[] =
            offId != null ? (officeUsers[offId] ?? []) : [];

          return (
            <div
              key={i}
              className="rounded-md border border-slate-100 dark:border-surface-400 bg-slate-50 dark:bg-surface-600/50 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => offId != null && toggleOffice(offId)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-surface-500/50 transition"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${statusDot[p.status] ?? "bg-slate-300"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {p.label}
                    {p.sublabel && (
                      <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                        ({p.sublabel})
                      </span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-200 dark:bg-surface-400 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {p.role}
                </span>
                <ChevronDown
                  className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-surface-400 px-3 py-2 space-y-1.5">
                  {isLoading ? (
                    <>
                      {[1, 2].map((n) => (
                        <div
                          key={n}
                          className="flex items-center gap-2 animate-pulse"
                        >
                          <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-surface-400 shrink-0" />
                          <div className="h-3 rounded bg-slate-200 dark:bg-surface-400 w-28" />
                          <div className="ml-auto h-3 rounded bg-slate-200 dark:bg-surface-400 w-12" />
                        </div>
                      ))}
                    </>
                  ) : users.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      No active users in this office.
                    </p>
                  ) : (
                    users.map((u) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-sky-600 dark:text-sky-400 uppercase">
                            {u.first_name?.[0]}
                            {u.last_name?.[0]}
                          </span>
                        </div>
                        <p className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">
                          {u.full_name}
                        </p>
                        {u.role?.label && (
                          <span className="shrink-0 text-[9px] text-slate-400 dark:text-slate-500">
                            {u.role.label}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default DocumentInfoParticipantsTab;
