import { FileStack, Users } from "lucide-react";

const TYPE_STYLES: Record<string, string> = {
  internal: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  external: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  forms: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

export function TypeBadge({ type }: { type: string }) {
  const cls =
    TYPE_STYLES[type?.toLowerCase()] ??
    "bg-slate-100 text-slate-600 dark:bg-surface-400 dark:text-slate-300";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}
    >
      {type || "—"}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  const isMultiDoc = mode === "multi_doc";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        isMultiDoc
          ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400"
          : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400",
      ].join(" ")}
    >
      {isMultiDoc ? (
        <FileStack className="h-2.5 w-2.5" />
      ) : (
        <Users className="h-2.5 w-2.5" />
      )}
      {isMultiDoc ? "Multi-Doc" : "Multi-Office"}
    </span>
  );
}

export function SourceBadge({
  source,
}: {
  source: "created" | "requested" | "shared";
}) {
  const map = {
    created: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    requested: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400",
    shared: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  };
  const label = { created: "Created", requested: "Requested", shared: "Shared" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[source]}`}
    >
      {label[source]}
    </span>
  );
}
