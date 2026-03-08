import React, { useEffect, useMemo, useState } from "react";
import type { DocumentTemplate } from "../../services/templates";
import TemplateCard from "./TemplateCard";
import SkeletonList from "../ui/loader/SkeletonList";

type Props = {
  templates: DocumentTemplate[];
  loading: boolean;
  deletingId: number | null;
  onDeleteClick: (id: number) => void;
  onSelect: (template: DocumentTemplate) => void;
};

const TemplateList: React.FC<Props> = ({
  templates,
  loading,
  deletingId,
  onDeleteClick,
  onSelect,
}) => {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [scope, setScope] = useState<"all" | "global" | "mine">("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const filtered = useMemo(() => {
    let list = templates;

    if (scope === "global") list = list.filter((t) => t.is_global);
    if (scope === "mine") list = list.filter((t) => t.can_delete);

    if (debouncedQ) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(debouncedQ) ||
          t.original_filename.toLowerCase().includes(debouncedQ) ||
          (t.description ?? "").toLowerCase().includes(debouncedQ),
      );
    }

    return list;
  }, [templates, debouncedQ, scope]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
          className="w-full sm:w-72 rounded-md border border-slate-300 dark:border-surface-400 bg-white dark:bg-surface-400 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-surface-400 bg-slate-50 dark:bg-surface-600 p-1">
          {(["all", "global", "mine"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={[
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition",
                scope === s
                  ? "bg-white dark:bg-surface-500 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-surface-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>

        {templates.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length} of {templates.length}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList rows={5} rowClassName="h-16 rounded-xl" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-400 bg-slate-50 dark:bg-surface-600 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {templates.length === 0
              ? "No templates yet."
              : "No templates match your search."}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {templates.length === 0
              ? "Upload the first template using the form."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isDeleting={deletingId === t.id}
              onDeleteClick={onDeleteClick}
              onDeleted={() => {}}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateList;
