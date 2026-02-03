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
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="m-0 text-xl font-semibold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-1 text-sm leading-snug text-slate-600">
            {subtitle}
          </div>
        )}
      </div>

      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </div>
  );
}
