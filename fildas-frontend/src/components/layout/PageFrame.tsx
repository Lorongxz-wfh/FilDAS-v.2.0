import React from "react";
import PageHeading from "../ui/PageHeading";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;

  /** Optional: adds padding around the scroll content */
  contentClassName?: string;

  /** Optional: extra classes for the outer wrapper */
  className?: string;

  children: React.ReactNode;
};

export default function PageFrame({
  title,
  subtitle,
  right,
  contentClassName = "",
  className = "",
  children,
}: Props) {
  return (
    <div
      className={`min-h-0 flex flex-1 flex-col overflow-hidden ${className}`}
    >
      {/* Fixed page header */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 backdrop-blur">
        <div className="px-6 py-4">
          <PageHeading title={title} subtitle={subtitle} right={right} />
        </div>
      </div>

      {/* The only scroll owner for normal pages */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Put padding INSIDE the scroll container */}
        <div className={`px-6 py-5 ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
