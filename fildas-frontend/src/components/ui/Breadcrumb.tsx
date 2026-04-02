import React from "react";
import { Link } from "react-router-dom";

export type BreadcrumbItem = { label: string; to?: string };

export default function Breadcrumb({
  items,
  size = "sm",
}: {
  items: BreadcrumbItem[];
  size?: "sm" | "md";
}) {
  if (!items.length) return null;
  const textSize = size === "md" ? "text-sm" : "text-xs";
  return (
    <nav className={`flex items-center gap-0.5 ${textSize} leading-none`} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="mx-1 text-slate-300 dark:text-slate-600 select-none">›</span>
            )}
            {isLast || !item.to ? (
              <span className={`text-slate-700 dark:text-slate-200 font-semibold truncate max-w-60`}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors truncate max-w-40"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
