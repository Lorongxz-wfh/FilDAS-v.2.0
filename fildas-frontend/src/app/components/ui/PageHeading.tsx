import React from "react";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

export default function PageHeading({
  title,
  subtitle,
  right,
  className = "",
}: Props) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
        )}
      </div>

      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
