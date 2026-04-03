import React from "react";
import Skeleton from "./Skeleton";

type Props = {
  count?: number;
  variant?: "simple" | "card" | "activity" | "document" | "text";
  rowClassName?: string; // only applies to 'simple' variant
  className?: string;    // applies to the container
};

const SkeletonList: React.FC<Props> = ({
  count = 3,
  variant = "simple",
  rowClassName = "h-10",
  className = "space-y-4",
}) => {
  return (
    <div className={["animate-pulse", className].join(" ")}>
      {Array.from({ length: count }).map((_, i) => {
        if (variant === "card") {
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-surface-400 dark:bg-surface-500"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton
                  className="h-3 rounded-sm bg-slate-100 dark:bg-surface-400"
                  style={{ width: `${60 + (i % 3) * 15}%` }}
                />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-20 rounded-sm bg-slate-100 dark:bg-surface-400" />
                  <Skeleton className="h-3.5 w-16 rounded-sm bg-slate-100 dark:bg-surface-400" />
                </div>
              </div>
              <Skeleton className="h-6 w-6 shrink-0 rounded-sm bg-slate-100 dark:bg-surface-400" />
            </div>
          );
        }

        if (variant === "activity") {
          return (
            <div key={i} className={`flex items-start gap-3 py-3 ${i === 0 ? "pt-1" : ""}`}>
              <Skeleton className="mt-0.5 h-6 w-6 shrink-0 rounded bg-slate-100 dark:bg-surface-400" />
              <div className="flex-1 space-y-2 min-w-0">
                <Skeleton className="h-3.5 w-3/4 bg-slate-100 dark:bg-surface-400" />
                <Skeleton className="h-2.5 w-1/4 bg-slate-100/50 dark:bg-surface-400/50" />
              </div>
            </div>
          );
        }

        if (variant === "document") {
          return (
            <div key={i} className="mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-0 border-slate-50 dark:border-surface-400/50">
              <div className="flex justify-between items-start mb-2">
                <Skeleton className="h-4 w-48 bg-slate-100 dark:bg-surface-400" />
                <Skeleton className="h-5 w-16 rounded bg-slate-100 dark:bg-surface-400" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-3 w-24 bg-slate-100/50 dark:bg-surface-400/50" />
                <Skeleton className="h-3 w-32 bg-slate-100/50 dark:bg-surface-400/50" />
              </div>
            </div>
          );
        }

        if (variant === "text") {
          return (
            <div key={i} className="space-y-2">
               <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-surface-400" />
               <Skeleton className="h-3 w-48 bg-slate-100/50 dark:bg-surface-400/50" />
            </div>
          );
        }

        return <Skeleton key={i} className={rowClassName} />;
      })}
    </div>
  );
};

export default SkeletonList;
